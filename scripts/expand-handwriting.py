"""Derive restrained, coherent outline variations from the user's original font."""
from pathlib import Path
from copy import deepcopy
import math,json,random
from PIL import Image,ImageDraw
import numpy as np
from fontTools.ttLib import TTFont
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from fontTools.ttLib.tables._g_l_y_f import GlyphCoordinates
ROOT=Path(__file__).resolve().parent.parent
font=TTFont(ROOT/'my-dyo-handwriting.ttf')
cmap=font.getBestCmap();alternates={}
for lookup in font['GSUB'].table.LookupList.Lookup:
 for sub in lookup.SubTable:
  if hasattr(sub,'alternates'):alternates.update(sub.alternates)
order=list(font.getGlyphOrder());library={};features=[];generated=0
for cp,base in sorted(cmap.items()):
 if cp<=32:continue
 originals=[base]+alternates.get(base,[]);versions=list(originals)
 original_coords=[font['glyf'][n].getCoordinates(font['glyf']) for n in originals]
 xs=[x for coords,_,_ in original_coords for x,y in coords];ys=[y for coords,_,_ in original_coords for x,y in coords]
 span=max(max(xs)-min(xs),max(ys)-min(ys),8);raster_scale=190/span
 def mask(coords,ends):
  image=Image.new('1',(256,256));draw=ImageDraw.Draw(image)
  midx=(min(x for x,y in coords)+max(x for x,y in coords))/2
  midy=(min(y for x,y in coords)+max(y for x,y in coords))/2
  start=0
  for end in ends:
   draw.polygon([(128+(x-midx)*raster_scale,128-(y-midy)*raster_scale) for x,y in coords[start:end+1]],fill=1);start=end+1
  return np.asarray(image,dtype=bool)
 masks=[mask(c,e) for c,e,_ in original_coords]
 for i in range(max(0,20-len(originals))):
  accepted=False
  for attempt in range(1500):
   source=originals[(i+attempt)%len(originals)];glyph=deepcopy(font['glyf'][source]);coords,ends,flags=glyph.getCoordinates(font['glyf'])
   if not len(coords):continue
   rng=random.Random(cp*10000019+i*9173+attempt*123457)
   sx=rng.uniform(.91,1.09);sy=rng.uniform(.955,1.045)
   shear=rng.choice([-1,1])*rng.uniform(.018,.075)
   width=max(x for x,y in coords)-min(x for x,y in coords)
   height=max(y for x,y in coords)-min(y for x,y in coords)
   ax=max(1.5,width*rng.uniform(.008,.035));ay=max(1,height*rng.uniform(.005,.02));phase=rng.uniform(0,math.tau)
   cx=(min(x for x,y in coords)+max(x for x,y in coords))/2
   cy=(min(y for x,y in coords)+max(y for x,y in coords))/2
   transformed=[]
   for x,y in coords:
    nx=cx+(x-cx)*sx+shear*(y-cy)+ax*math.sin((y-cy)/max(10,height)*math.pi+phase)
    ny=y*sy+ay*math.sin((x-cx)/max(10,width)*math.pi+phase)
    transformed.append((round(nx),round(ny)))
   candidate=mask(transformed,ends)
   differences=[np.count_nonzero(candidate ^ m)/max(1,np.count_nonzero(candidate | m)) for m in masks]
   if min(differences)<.075:continue
   masks.append(candidate);accepted=True;break
  if not accepted:raise RuntimeError(f'Cannot produce distinct quality variations for {chr(cp)}')
  glyph.coordinates=GlyphCoordinates(transformed);glyph.recalcBounds(font['glyf'])
  name=f'dyo_u{cp:04X}_derived_{i+1}'
  font['glyf'][name]=glyph;advance,lsb=font['hmtx'][source]
  font['hmtx'][name]=(round(advance*sx),glyph.xMin)
  order.append(name);versions.append(name);generated+=1
 if len(versions)>1:features.append(f'sub {base} from [{" ".join(versions[1:])}];')
 gs=[]
 for name in versions:
  glyph=font['glyf'][name];coords,ends,flags=glyph.getCoordinates(font['glyf']);strokes=[];start=0
  for end in ends:
   points=[[round(x/1.5,2),round(440-y/1.5,2)] for x,y in coords[start:end+1]]
   strokes.append({'w':1,'fill':True,'points':points});start=end+1
  if strokes:gs.append({'width':round(font['hmtx'][name][0]/1.5,2),'normalized':False,'imported':True,'strokes':strokes})
 library[chr(cp)]=gs
font.setGlyphOrder(order)
addOpenTypeFeaturesFromString(font,'languagesystem DFLT dflt; feature salt { '+' '.join(features)+' } salt;')
for record in font['name'].names:
 if record.nameID in [1,3,4,6]:
  names={1:'My Dyo Handwriting Expanded',3:'Dyo:Expanded:2.0',4:'My Dyo Handwriting Expanded',6:'MyDyoHandwritingExpanded'}
  record.string=names[record.nameID].encode(record.getEncoding())
font.save(ROOT/'outputs/my-dyo-handwriting-expanded.ttf')
(ROOT/'outputs/dyo-expanded-backup.json').write_text(json.dumps({'version':1,'glyphs':library,'metrics':{}},ensure_ascii=False,separators=(',',':')))
print(json.dumps({'characters':len(library),'generated':generated,'total_versions':sum(map(len,library.values())),'minimum':min(map(len,library.values())), 'visual_difference_threshold':0.075,'backup_bytes':(ROOT/'outputs/dyo-expanded-backup.json').stat().st_size}))
