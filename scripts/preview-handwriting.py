from pathlib import Path
from fontTools.ttLib import TTFont
from PIL import Image,ImageDraw,ImageFont
import tempfile
root=Path(__file__).resolve().parent.parent
font=TTFont(root/'outputs/my-dyo-handwriting-expanded.ttf');alternates={}
for lookup in font['GSUB'].table.LookupList.Lookup:
 for sub in lookup.SubTable:
  if hasattr(sub,'alternates'):alternates.update(sub.alternates)
cmap=dict(font.getBestCmap())
image=Image.new('RGB',(1600,1740),'#fffef8');draw=ImageDraw.Draw(image)
with tempfile.TemporaryDirectory(prefix='dyo-preview-') as temp:
 for i in range(20):
  for table in font['cmap'].tables:
   if table.isUnicode():
    for cp,base in cmap.items():
     versions=[base]+alternates.get(base,[]);table.cmap[cp]=versions[min(i,len(versions)-1)]
  path=Path(temp)/f'{i}.ttf';font.save(path);sample=ImageFont.truetype(str(path),42)
  draw.text((1530,14+i*86),'שלום עולם, זה כתב היד שלי. Hello world 123',font=sample,fill='#263d39',anchor='ra',direction='rtl')
  draw.text((25,24+i*86),str(i+1),fill='#263d39')
image.save(root/'outputs/variants-preview.png')
