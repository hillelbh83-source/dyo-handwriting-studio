'use strict';
const fractionBarCharacter='⎯';
const characterLatex={
 '⎯':'\\rule{0.9em}{0.04em}',
 '■':'\\blacksquare',
 '−':'-', '*':'\\ast','^':'\\text{\\textasciicircum}',
 '∫':'\\int','∑':'\\sum','∏':'\\prod','√':'\\surd','∞':'\\infty','∂':'\\partial','∆':'\\Delta','∇':'\\nabla','±':'\\pm','×':'\\times','÷':'\\div','≠':'\\neq','≈':'\\approx','≤':'\\leq','≥':'\\geq','∈':'\\in','∉':'\\notin','∪':'\\cup','∩':'\\cap','⊂':'\\subset','⊆':'\\subseteq','→':'\\rightarrow','↔':'\\leftrightarrow','∀':'\\forall','∃':'\\exists',
 'α':'\\alpha','β':'\\beta','γ':'\\gamma','δ':'\\delta','ε':'\\varepsilon','θ':'\\theta','λ':'\\lambda','μ':'\\mu','π':'\\pi','σ':'\\sigma','φ':'\\varphi','ω':'\\omega',
 '{':'\\{','}':'\\}','_':'\\_','\\':'\\backslash','|':'\\vert','#':'\\#','$':'\\$','%':'\\%','&':'\\&','~':'\\text{\\textasciitilde}',
 '"':'\\text{"}',"'":"\\text{'}",'`':'\\text{`}','—':'\\text{—}','–':'\\text{–}','-':'\\text{-}'
};
const latexCharacterNames={'■':'סיום הוכחה','∫':'אינטגרל','∑':'סכום','∏':'מכפלה','√':'שורש','∞':'אינסוף','∂':'נגזרת חלקית','∆':'דלתא גדולה','∇':'נבלה','±':'פלוס מינוס','×':'כפל','÷':'חילוק','≠':'לא שווה','≈':'שווה בקירוב','≤':'קטן או שווה','≥':'גדול או שווה','∈':'שייך','∉':'לא שייך','∪':'איחוד','∩':'חיתוך','⊂':'מוכל','⊆':'מוכל או שווה','→':'חץ ימינה','↔':'חץ דו כיווני','∀':'לכל','∃':'קיים','α':'אלפא','β':'בטא','γ':'גמא','δ':'דלתא','ε':'אפסילון','θ':'תטא','λ':'למדא','μ':'מיו','π':'פאי','σ':'סיגמא','φ':'פאי יוונית','ω':'אומגה'};
latexCharacterNames[fractionBarCharacter]='קו שבר';
function isLatexCharacter(c){return groups.math.includes(c)||groups.numbers.includes(c)}
function renderCharacterLabel(element,c){
 element.replaceChildren();element.classList.toggle('latex-character',isLatexCharacter(c));
 if(!isLatexCharacter(c)){element.textContent=c;return}
 const label=document.createElement('span');label.className='latex-symbol';label.dir='ltr';
 katex.render(characterLatex[c]||c,label,{throwOnError:true,trust:false,output:'html',strict:'error'});
 label.setAttribute('aria-hidden','true');element.append(label);
}
