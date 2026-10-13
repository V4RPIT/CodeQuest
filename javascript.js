'use strict';
/* =====================================================================
   CODE QUEST  -  a coding game with a platformer theme
   5 worlds (HTML, CSS, JavaScript, Python, C++) x 4 levels x 4 challenges
   ===================================================================== */

/* ---------- helpers ---------- */
const $=(s,r=document)=>r.querySelector(s);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const norm=s=>String(s).toLowerCase().replace(/\s+/g,'').replace(/[\u201C\u201D]/g,'"').replace(/[\u2018\u2019]/g,"'");
const TEST_MODE=new URLSearchParams(window.location.search).get('test')==='1';
const SAVE_KEY=TEST_MODE?'codequest.test.v1':'codequest.v1';

/* ---------- pixel sprites ---------- */
function sprite(rows,pal,scale){
  const h=rows.length,w=rows[0].length;let r='';
  rows.forEach((row,y)=>[...row].forEach((c,x)=>{if(pal[c])r+=`<rect x="${x}" y="${y}" width="1" height="1" fill="${pal[c]}"/>`;}));
  return `<svg class="spr" viewBox="0 0 ${w} ${h}" width="${w*scale}" height="${h*scale}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}
const HERO=[
 '..RRRRRR..','.RRRWWRRR.','.RRRWWRRR.','RRRRRRRRRR','.SSSSSSSS.','.SKSSSSKS.','.SSSSSSSS.',
 '..SSMMSS..','.UUUUUUUU.','.UUYUUYUU.','SUUUUUUUUS','..UU..UU..','.KKK..KKK.','KKKK..KKKK'];
const PAL_HERO={R:'#E8392B',W:'#FFFFFF',S:'#FFC89A',K:'#2B1B17',M:'#B5382A',U:'#2F5BEA',Y:'#FFD23F'};
const BUG=['..K....K..','...K..K...','..GGGGGG..','.GGWGGWGG.','GGGGGGGGGG','GGGGGGGGGG','.G.G..G.G.','G..G..G..G'];
const PAL_BUG={G:'#8E44D6',W:'#FFFFFF',K:'#14142B'};
const HEART=['.RR.RR.','RRRRRRR','RRRRRRR','.RRRRR.','..RRR..','...R...'];
const STAR=['...Y...','...Y...','YYYYYYY','.YYYYY.','..YYY..','.YY.YY.','YY...YY'];
const VOLTLING=[
  '.....DD.....',
  '....DCCD....',
  '...DCCCCD...',
  '..DCCYYCCD..',
  '.DCCYYYYCCD.',
  'DCCYYYYYYCCD',
  'DCCYYDDYYCCD',
  'DCCYDDDYDCCD',
  'DCCYYYYYYCCD',
  '.DCCYYYYCCD.',
  '..DCCYYCCD..',
  '...DCCCCD...',
  '....DCCD....',
  '.....DD.....'
];
const PAL_VOLTLING={D:'#25324F',C:'#53D9D1',Y:'#FFF07A'};

/* ---------- tiny code highlighter ---------- */
const RX={
 html:/(<!--[\s\S]*?-->)|(___)|("[^"]*")|(<\/?[a-zA-Z][\w-]*|\/?>)|(\b[\w-]+(?==))/g,
 css:/(\/\*[\s\S]*?\*\/)|(___)|("[^"]*")|(\b[\w-]+(?=\s*:))|(\b\d+(?:\.\d+)?(?:px|em|rem|%)?)|([.#][a-zA-Z][\w-]*)/g,
 js:/(\/\/.*|\/\*[\s\S]*?\*\/)|(___)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b\d+(?:\.\d+)?\b)|\b(let|const|var|function|return|if|else|for|while|true|false)\b|\b(console|log)\b/g,
 py:/(#.*)|(___)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b\d+(?:\.\d+)?\b)|\b(def|return|if|elif|else|for|while|in|True|False|and|or|not)\b|\b(print|input|int|range|len)\b/g,
 cpp:/(\/\/.*)|(___)|("(?:\\.|[^"\\])*")|(\b\d+(?:\.\d+)?\b)|(#include|\b(?:int|float|double|char|string|void|return|if|else|for|while|using|namespace|true|false|bool)\b)|\b(cout|cin|main|std|iostream)\b/g
};
const CLS={
 html:['com','blank','str','kw','attr'],
 css:['com','blank','str','attr','num','kw'],
 js:['com','blank','str','num','kw','attr'],
 py:['com','blank','str','num','kw','attr'],
 cpp:['com','blank','str','num','kw','attr']
};
function hl(code,lang){
  const rx=new RegExp(RX[lang].source,'g'),cls=CLS[lang];let out='',last=0,m;
  while((m=rx.exec(code))){
    out+=esc(code.slice(last,m.index));
    let c=null;for(let i=0;i<cls.length;i++){if(m[i+1]!==undefined){c=cls[i];break;}}
    if(c==='blank')out+='<span class="t-blank">&nbsp;&nbsp;&nbsp;</span>';
    else out+=c?`<span class="t-${c}">${esc(m[0])}</span>`:esc(m[0]);
    last=m.index+m[0].length;if(m[0]==='')rx.lastIndex++;
  }
  return out+esc(code.slice(last));
}

/* ---------- sound (Web Audio chiptune beeps) ---------- */
let AC=null;
let sfxVolume=.5;
let musicTimer=null,musicStep=0;
function ac(){
  if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){}}
  if(AC&&AC.state==='suspended')AC.resume();
  return AC;
}
function tone(f,t,d,type='square',v=.05,slide){
  const a=AC;if(!a||save.muted||sfxVolume===0)return;
  const o=a.createOscillator(),g=a.createGain(),s=a.currentTime+t;
  o.type=type;o.frequency.setValueAtTime(f,s);
  if(slide)o.frequency.exponentialRampToValueAtTime(slide,s+d);
  g.gain.setValueAtTime(v*sfxVolume,s);g.gain.exponentialRampToValueAtTime(.0001,s+d);
  o.connect(g);g.connect(a.destination);o.start(s);o.stop(s+d+.02);
}
const sfx={
  click(){tone(520,0,.05,'square',.025);},
  coin(){tone(988,0,.08);tone(1319,.08,.3);},
  jump(){tone(260,0,.22,'square',.05,780);},
  wrong(){tone(220,0,.18,'sawtooth',.05,110);tone(150,.16,.3,'sawtooth',.05,70);},
  win(){[523,659,784,1047,784,1047].forEach((f,i)=>tone(f,i*.12,.16));},
  over(){[392,330,262,196].forEach((f,i)=>tone(f,i*.2,.25,'triangle',.07));}
};
function musicTick(){
  if(save.musicMuted||save.musicVolume===0||!AC)return;
  const notes=[262,330,392,330,294,349,440,349];
  const o=AC.createOscillator(),g=AC.createGain();
  o.type='triangle';o.frequency.value=notes[musicStep++%notes.length];
  g.gain.setValueAtTime(save.musicVolume*.035,AC.currentTime);
  g.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+.22);
  o.connect(g);g.connect(AC.destination);o.start();o.stop(AC.currentTime+.23);
}
function syncMusic(){
  if(save.musicMuted){clearInterval(musicTimer);musicTimer=null;return;}
  if(!musicTimer){musicTick();musicTimer=setInterval(musicTick,300);}
}

/* ---------- challenge builders ---------- */
const mc=(k,q,o,a,e,code)=>({t:'mc',k,q,o,a,e,code});   // multiple choice. k: q | out | bug
const ty=(q,code,ok,e)=>({t:'ty',q,code,ok,e});          // type the missing code
const od=(q,lines,e)=>({t:'od',q,lines,e});              // put lines in order

/* ---------- the worlds ---------- */
const WORLDS=[
{name:'HTML',title:'Page Plains',blurb:'Build the skeleton of web pages',lang:'html',
 sky:'#5C94FC',hill:'#3CBC3C',ground:'#C84C0C',top:'#3CBC3C',accent:'#D9441A',on:'#fff',wink:'#14142B',dark:false,
 levels:[
 {n:'Tags and headings',
  l:'HTML is the skeleton of every web page. Tags like <h1> wrap your content: an opening tag, the content, then a closing tag with a slash.',
  c:'<h1>Hello!</h1>\n<p>My first page.</p>',
  ch:[
   mc('q','Which tag makes the BIGGEST heading?',['<h6>','<h1>','<head>','<big>'],1,'<h1> is the biggest heading and <h6> is the smallest.'),
   ty('Type the missing closing tag.','<p>I love coding!___',['</p>'],'A closing tag repeats the tag name with a / in front.'),
   od('Put these lines in order to build a tiny web page.',['<html>','<body>','<h1>Hello World</h1>','</body>','</html>'],'The page opens with <html>, then <body>, then the content. Tags close in reverse order.'),
   mc('q','Which paragraph is written correctly?',['<p>Hello<p>','<p>Hello</p>','</p>Hello<p>','<paragraph>Hello</paragraph>'],1,'A paragraph opens with <p> and closes with </p>.')
  ]},
 {n:'Text and links',
  l:'Links use the <a> tag. Its href attribute says where the link goes. <strong> makes text bold and important.',
  c:'<a href="https://example.com">Go!</a>\n<strong>Important</strong>',
  ch:[
   mc('q','Which tag creates a link?',['<link>','<a>','<url>','<go>'],1,'<a> is the anchor tag. It turns text into a link.'),
   ty('Which attribute holds the web address?','<a ___="https://example.com">Visit</a>',['href'],'href stands for hypertext reference.'),
   mc('q','Which tag makes text bold and important?',['<bold>','<strong>','<thick>','<heavy>'],1,'<strong> marks important text, and browsers show it in bold. (<b> works too.)'),
   od('Build the page: heading first, then the paragraph, then the link.',['<body>','<h1>My Games</h1>','<p>I love platformers.</p>','<a href="games.html">See the list</a>','</body>'],'Content appears on the page in the order you write it, inside <body>.')
  ]},
 {n:'Images and lists',
  l:'<img> shows a picture: src is the file and alt describes it. Lists use <ul> for bullets or <ol> for numbers, with <li> for each item.',
  c:'<img src="star.png" alt="A star">\n<ul>\n  <li>Coins</li>\n</ul>',
  ch:[
   mc('q','Which tag shows a picture?',['<pic>','<img>','<photo>','<src>'],1,'<img> displays an image.'),
   ty('Which attribute tells the image which file to show?','<img ___="star.png" alt="A star">',['src'],'src is short for source.'),
   mc('q','Which tag starts a bulleted list?',['<ol>','<ul>','<li>','<bl>'],1,'<ul> is an unordered (bullet) list, <ol> is numbered, and <li> is one item.'),
   od('Build a numbered list in the right order.',['<ol>','<li>First: wake up</li>','<li>Second: eat</li>','<li>Third: code</li>','</ol>'],'<ol> opens the list, each <li> is an item, and </ol> closes it.')
  ]},
 {n:'Page structure',
  l:'A page lives inside <html>. The <head> holds info like <title>, and the <body> holds everything people see. <input> makes a box to type in.',
  c:'<html>\n  <head><title>My Game</title></head>\n  <body>\n    <input type="text">\n  </body>\n</html>',
  ch:[
   mc('q','Which tag creates a box where people can type?',['<input>','<textbox>','<type>','<write>'],0,'<input> makes text boxes, checkboxes, buttons and more.'),
   ty('Everything people see on the page goes inside this tag.','<html>\n  <head><title>My Game</title></head>\n  <___>\n    <h1>Hi!</h1>\n  </body>\n</html>',['<body>','body'],'<body> holds the visible content.'),
   mc('q','In <title>Level 1</title>, where does the text show up?',['In big letters on the page','On the browser tab','In a pop-up','Nowhere'],1,'The <title> text appears on the browser tab.'),
   mc('bug','Find the bug.',['<ul> should be <ol>','The second <li> is never closed','Red must be bold','Nothing is wrong'],1,'Every <li> needs a closing </li>.','<ul>\n  <li>Red</li>\n  <li>Blue\n</ul>')
  ]}
 ]},
{name:'CSS',title:'Candy Sky',blurb:'Paint pages with colors and layouts',lang:'css',
 sky:'#FFA6D5',hill:'#B58CFF',ground:'#8A3FB0',top:'#FF6FB5',accent:'#2965F1',on:'#fff',wink:'#14142B',dark:false,
 levels:[
 {n:'Colors and selectors',
  l:'CSS makes pages pretty. A rule has a selector, then properties inside { }. Use .name to pick a class and #name to pick an id.',
  c:'h1 {\n  color: red;\n}\n.coin {\n  color: gold;\n}',
  ch:[
   mc('q','Which property changes the text color?',['font-color','text-color','color','ink'],2,'The property is simply called color.'),
   ty('Make the heading blue.','h1 {\n  ___: blue;\n}',['color'],'color sets the text color.'),
   mc('q','Which selector picks elements with class="coin"?',['#coin','.coin','coin','*coin'],1,'Use a dot for classes (.coin) and a hash for ids (#coin).'),
   od('Write a rule that turns every h1 red.',['h1 {','  color: red;','}'],'Selector, opening brace, property, closing brace.')
  ]},
 {n:'The box model',
  l:'Every element is a box. Padding is space inside, then comes the border, then margin is space outside.',
  c:'.box {\n  padding: 10px;\n  border: 2px solid black;\n  margin: 20px;\n}',
  ch:[
   mc('q','Which property adds space INSIDE a box, between content and border?',['margin','padding','gap','border'],1,'Padding is inside the border. Margin is outside.'),
   ty('Add a 2px solid black outline around the box.','.box {\n  ___: 2px solid black;\n}',['border'],'border draws a line around the box.'),
   mc('q','Which property pushes OTHER elements away from a box?',['padding','margin','border','content'],1,'Margin is the space outside the border.'),
   mc('out','What does margin: 0 auto; do to this box?',['Centers it horizontally','Hides it','Makes it round','Adds a border'],0,'Auto margins on the left and right center a block that has a width.','.box {\n  width: 200px;\n  margin: 0 auto;\n}')
  ]},
 {n:'Text and fonts',
  l:'Style text with font-size, font-weight, font-family and text-align.',
  c:'p {\n  font-size: 18px;\n  font-weight: bold;\n  text-align: center;\n}',
  ch:[
   mc('q','Which property sets the size of text?',['text-size','font-size','size','font-big'],1,'font-size controls how big text is.'),
   ty('Center the text.','p {\n  text-align: ___;\n}',['center'],'text-align: center puts text in the middle.'),
   mc('q','Which rule makes text bold?',['font-weight: bold;','text-bold: yes;','bold: true;','font-style: bold;'],0,'font-weight controls how thick the letters are.'),
   od('Style .title: font size first, then bold.',['.title {','  font-size: 32px;','  font-weight: bold;','}'],'Each rule sits between the braces, one property per line.')
  ]},
 {n:'Flexbox boss',
  l:'Flexbox lines items up. Put display: flex on the parent, then use justify-content and flex-direction.',
  c:'.row {\n  display: flex;\n  justify-content: center;\n}',
  ch:[
   mc('q','Which rule turns a container into a flexbox?',['display: flex;','flex: container;','layout: flex;','position: flex;'],0,'display: flex switches on flexbox for the children.'),
   ty('Center the items along the row.','.row {\n  display: flex;\n  justify-content: ___;\n}',['center'],'justify-content: center centers items along the main axis.'),
   mc('q','What does flex-direction: column do?',['Stacks items top to bottom','Makes text columns','Hides the items','Adds a border'],0,'Column direction stacks the items vertically.'),
   mc('bug','Find the bug.',['There is no colon after color','The semicolon is wrong','The selector is wrong','Nothing is wrong'],0,'A property and its value are separated by a colon.','.box {\n  color red;\n}')
  ]}
 ]},
{name:'JavaScript',title:'Desert of Logic',blurb:'Make pages think and move',lang:'js',
 sky:'#FFD27A',hill:'#E8A04A',ground:'#B8741F',top:'#E8C25A',accent:'#F7DF1E',on:'#14142B',wink:'#14142B',dark:false,
 levels:[
 {n:'Variables',
  l:'Variables are named boxes that store values. Use let to make one, and console.log to show it.',
  c:'let coins = 5;\ncoins = coins + 1;\nconsole.log(coins); // 6',
  ch:[
   mc('q','Which keyword creates a variable that can change?',['let','set','int','dim'],0,'let creates a variable. (const makes one that cannot change.)'),
   ty('Create a variable called score.','___ score = 10;',['let','var'],'let (or the older var) creates a variable.'),
   mc('out','What does this print?',['3','5','32','Error'],1,'a starts at 3, then becomes 3 + 2 = 5.','let a = 3;\na = a + 2;\nconsole.log(a);'),
   mc('q','Which is a valid variable name?',['my coins','2fast','coin_count','coin-count'],2,'Names cannot contain spaces or dashes, or start with a number.')
  ]},
 {n:'Strings and math',
  l:'Strings are text in quotes, and + joins them. The % sign gives the remainder after dividing.',
  c:'console.log("Hi " + "Cody");\nconsole.log(7 % 3); // 1',
  ch:[
   mc('out','What does this print?',['Hi there','Hithere','Hi + there','Error'],0,'+ joins the two strings, including the space.','console.log("Hi " + "there");'),
   ty('Print the remainder of 7 divided by 3.','console.log(7 ___ 3);',['%'],'7 divided by 3 is 2 with 1 left over, so 7 % 3 is 1.'),
   mc('out','What does this print?',['5','23','Error','undefined'],1,'A number plus text joins as text, so you get "23".','console.log(2 + "3");'),
   od('Put the lines in order so the total prints.',['let coins = 3;','let total = coins * 2;','console.log(total);'],'A variable must exist before you use it.')
  ]},
 {n:'If and loops',
  l:'if / else makes choices. Loops repeat code: for (start; condition; step) runs while the condition is true.',
  c:'if (score > 10) {\n  console.log("Win!");\n}\nfor (let i = 0; i < 3; i++) {\n  console.log(i);\n}',
  ch:[
   mc('out','What does this print?',['yes','no','yes no','Error'],0,'5 > 3 is true, so the if branch runs.','if (5 > 3) {\n  console.log("yes");\n} else {\n  console.log("no");\n}'),
   ty('Count up by one each time.','for (let i = 0; i < 3; ___) {\n  console.log(i);\n}',['i++','i+=1','++i','i=i+1'],'i++ adds one to i after every loop.'),
   mc('out','How many times does this print?',['3','4','5','Forever'],1,'i is 1, 2, 3 and 4, so four times.','for (let i = 1; i <= 4; i++) {\n  console.log(i);\n}'),
   mc('q','Which operator checks that two values are strictly equal?',['=','==','===','=>'],2,'= stores a value. === compares value and type.')
  ]},
 {n:'Functions and arrays',
  l:'Arrays hold lists, and counting starts at 0. Functions are reusable blocks of code that can return a value.',
  c:'let items = ["coin", "star"];\nfunction double(n) {\n  return n * 2;\n}',
  ch:[
   mc('out','What does this print?',['coin','star','gem','0'],0,'Counting starts at 0, so items[0] is the first item.','let items = ["coin", "star", "gem"];\nconsole.log(items[0]);'),
   ty('Start a function called jump.','___ jump() {\n  console.log("Boing!");\n}',['function'],'function begins a function.'),
   mc('out','What does this print?',['4','6','8','double'],2,'double(4) returns 4 * 2 = 8.','function double(n) {\n  return n * 2;\n}\nconsole.log(double(4));'),
   mc('out','What does this print?',['3','4','5','undefined'],1,'push adds 4 to the end, so the array has 4 items.','let a = [1, 2, 3];\na.push(4);\nconsole.log(a.length);')
  ]}
 ]},
{name:'Python',title:'Python Caverns',blurb:'Friendly code that reads like English',lang:'py',
 sky:'#1E2B63',hill:'#2C3F96',ground:'#3B3B7A',top:'#1FA64A',accent:'#3776AB',on:'#fff',wink:'#fff',dark:true,
 levels:[
 {n:'Print and variables',
  l:'Python reads like English. print() shows things, = stores a value in a variable, and # starts a comment.',
  c:'name = "Cody"\nprint(name)  # shows Cody',
  ch:[
   mc('q','Which line prints text?',['echo("Hi")','print("Hi")','say("Hi")','console("Hi")'],1,'print() shows text on the screen.'),
   ty('Show the greeting on screen.','___("Hello, world!")',['print'],'print() displays whatever is inside the brackets.'),
   mc('out','What does this print?',['name','Cody','"Cody"','Error'],1,'print(name) shows the value stored in name.','name = "Cody"\nprint(name)'),
   mc('q','Which symbol starts a comment in Python?',['//','#','<!--','/*'],1,'Python ignores everything after a # on that line.')
  ]},
 {n:'Numbers and input',
  l:'input() asks the player for text. int() turns text into a whole number. // divides and drops the decimals.',
  c:'age = int(input("Age? "))\nprint(10 // 3)  # 3',
  ch:[
   mc('out','What does this print?',['3.33','3','4','1'],1,'// is floor division, so the decimals are dropped.','print(10 // 3)'),
   ty('Turn the typed text into a whole number.','age = ___(input("Age? "))',['int'],'input() gives text. int() converts it to a number.'),
   mc('out','What does this print?',['10','55','Error','5'],1,'Both values are strings, so + joins them.','print("5" + "5")'),
   od('Put the lines in order so the result prints.',['coins = 4','double = coins * 2','print(double)'],'Create a variable first, use it next, print last.')
  ]},
 {n:'If, else and loops',
  l:'Python uses indentation (spaces) to show what is inside an if, else or loop. range(3) gives 0, 1, 2.',
  c:'if x > 5:\n    print("big")\nfor i in range(3):\n    print(i)',
  ch:[
   mc('out','What does this print?',['big','small','big small','Error'],0,'7 > 5 is true, so it prints big.','x = 7\nif x > 5:\n    print("big")\nelse:\n    print("small")'),
   ty('Repeat 3 times (0, 1, 2).','for i in ___(3):\n    print(i)',['range'],'range(3) makes the numbers 0, 1 and 2.'),
   mc('q','What does Python use to group code inside if and loops?',['Curly braces { }','Indentation','Semicolons','Parentheses'],1,'Indented lines belong to the block above them.'),
   mc('out','What does this print?',['0','2','3','Forever'],2,'n goes up by 1 until it reaches 3, then the loop stops.','n = 0\nwhile n < 3:\n    n += 1\nprint(n)')
  ]},
 {n:'Lists and functions',
  l:'Lists hold many values and len() counts them. def makes a function and return sends back a result.',
  c:'items = ["coin", "star"]\ndef hello():\n    return "Hi"',
  ch:[
   mc('out','What does this print?',['1','2','coin','Error'],1,'The list has two items.','items = ["coin", "star"]\nprint(len(items))'),
   ty('Start a function called add.','___ add(a, b):\n    return a + b',['def'],'def is short for define.'),
   mc('out','What does this print?',['hello','Hi','None','Error'],1,'hello() returns the string "Hi", and print shows it.','def hello():\n    return "Hi"\nprint(hello())'),
   od('Define the function first, then call it.',['def square(n):','    return n * n','print(square(5))'],'A function must be defined before you call it.')
  ]}
 ]},
{name:'C++',title:'Castle of Types',blurb:'Fast, powerful and strict',lang:'cpp',
 sky:'#3B0D12',hill:'#6E1D22',ground:'#2A1416',top:'#FF6A00',accent:'#00599C',on:'#fff',wink:'#fff',dark:true,
 levels:[
 {n:'Hello, C++',
  l:'C++ programs start in main(). #include <iostream> gives you cout for printing, and every statement ends with a semicolon.',
  c:'#include <iostream>\nusing namespace std;\nint main() {\n  cout << "Hello";\n  return 0;\n}',
  ch:[
   mc('q','Which line prints text in C++?',['print("Hi")','cout << "Hi";','echo "Hi"','System.out("Hi")'],1,'cout sends text to the screen.'),
   ty('Include the library that gives you cout.','#include <___>',['iostream'],'iostream handles input and output.'),
   mc('q','Which function does every C++ program start running from?',['start()','main()','run()','begin()'],1,'Execution always begins in main().'),
   od('Build the Hello program in order.',['#include <iostream>','using namespace std;','int main() {','  cout << "Hello";','  return 0;','}'],'Includes first, then main with the code inside its braces.')
  ]},
 {n:'Variables and types',
  l:'C++ needs a type for every variable: int for whole numbers, float or double for decimals, char for one letter, string for text.',
  c:'int coins = 7;\ndouble price = 9.99;\ncout << 7 / 2;  // 3',
  ch:[
   mc('q','Which type stores whole numbers?',['int','float','char','string'],0,'int holds whole numbers.'),
   ty('Store the decimal price.','___ price = 9.99;',['float','double'],'float and double hold decimal numbers.'),
   mc('out','What does this print?',['3.5','3','4','Error'],1,'Both numbers are ints, so the decimals are dropped.','int a = 7 / 2;\ncout << a;'),
   mc('bug','Find the bug.',['Missing semicolon after 5','cout is spelled wrong','int is wrong','Nothing is wrong'],0,'Every C++ statement ends with a semicolon.','int coins = 5\ncout << coins;')
  ]},
 {n:'Conditions and loops',
  l:'if, else and loops work like in other languages, with ( ) around the condition and { } around the code.',
  c:'if (x > 5) {\n  cout << "big";\n}\nfor (int i = 0; i < 3; i++) {\n  cout << i;\n}',
  ch:[
   mc('out','What does this print?',['A','B','AB','Error'],1,'3 > 5 is false, so the else branch prints B.','int x = 3;\nif (x > 5) {\n  cout << "A";\n} else {\n  cout << "B";\n}'),
   ty('Count up by one.','for (int i = 0; i < 3; ___) {\n  cout << i;\n}',['i++','i+=1','++i','i=i+1'],'i++ adds one each time.'),
   mc('q','Which keyword repeats code while a condition is true?',['while','if','switch','return'],0,'A while loop keeps going as long as its condition is true.'),
   mc('out','What does this print?',['024','02','0246','012'],0,'i is 0, 2, 4. Then 6 is not less than 5, so the loop stops.','for (int i = 0; i < 5; i += 2) {\n  cout << i;\n}')
  ]},
 {n:'Functions and arrays',
  l:'Arrays store many values of one type. A function lists its return type, name and parameters.',
  c:'int a[3] = {10, 20, 30};\nint add(int x, int y) {\n  return x + y;\n}',
  ch:[
   mc('out','What does this print?',['10','20','30','1'],1,'Counting starts at 0, so a[1] is the second item.','int a[3] = {10, 20, 30};\ncout << a[1];'),
   ty('Which return type does this function need for whole numbers?','___ add(int a, int b) {\n  return a + b;\n}',['int'],'The function returns a whole number, so its type is int.'),
   mc('q','What does the return type void mean?',['Returns nothing','Returns a number','Returns text','Returns an error'],0,'void means the function gives nothing back.'),
   mc('out','What does this print?',['8','16','4','sq'],1,'sq(4) returns 4 * 4 = 16.','int sq(int n) {\n  return n * n;\n}\ncout << sq(4);')
  ]}
 ]}
];

/* ---------- save data ---------- */
const THEMES={classic:{name:'Classic Worlds',cost:0,description:'The original colorful Code Quest look.'},voltage:{name:'Voltage Grove',cost:700,description:'A moonlit electric grove with a floating crystal mascot.'}};
const DEF={coins:0,stars:{},muted:false,musicMuted:true,name:'',skin:'classic',skins:['classic'],theme:'classic',themes:['classic'],guided:false,fontScale:1,sfxVolume:.5,musicVolume:.2};
let save=loadSave();
function loadSave(){
  try{
    const s=JSON.parse(localStorage.getItem(SAVE_KEY));
    if(s&&typeof s==='object'){
      const themes=Array.isArray(s.themes)?[...new Set(s.themes.filter(id=>Object.hasOwn(THEMES,id)))]:['classic'];
      if(!themes.includes('classic'))themes.push('classic');
      const selectedTheme=themes.includes(s.theme)?s.theme:'classic';
      return Object.assign({},DEF,s,{
      stars:s.stars&&typeof s.stars==='object'?s.stars:{},
      skins:Array.isArray(s.skins)?s.skins:['classic'],
      theme:selectedTheme,
      themes,
      fontScale:[.9,1,1.15,1.3].includes(s.fontScale)?s.fontScale:1,
      sfxVolume:Number.isFinite(s.sfxVolume)?Math.max(0,Math.min(1,s.sfxVolume)):.5,
      musicVolume:Number.isFinite(s.musicVolume)?Math.max(0,Math.min(1,s.musicVolume)):.2
      });
    }
  }catch(e){console.warn('Could not load saved Code Quest progress.',e);}
  return Object.assign({},DEF,{coins:TEST_MODE?10000:DEF.coins,stars:{}});
}
function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));return true;}catch(e){console.warn('Could not save Code Quest progress.',e);return false;}}
const key=(w,l)=>w+'-'+l;
const starsOf=(w,l)=>save.stars[key(w,l)]||0;
const unlocked=(w,l)=>l===0?(!save.guided||w===0||WORLDS[w-1].levels.every((_,li)=>starsOf(w-1,li)>0)):starsOf(w,l-1)>0;
const totalStars=()=>Object.values(save.stars).reduce((a,b)=>a+b,0);
const theme=w=>save.theme==='voltage'?'':`--sky:${w.sky};--hill:${w.hill};--ground:${w.ground};--gtop:${w.top};--accent:${w.accent};--on:${w.on};--wink:${w.wink}`;
const SKINS={
  classic:{name:'Classic',cost:0,colors:PAL_HERO},
  green:{name:'Forest',cost:100,colors:{...PAL_HERO,U:'#27864A',R:'#F1B52B'}},
  purple:{name:'Galaxy',cost:220,colors:{...PAL_HERO,U:'#783EB8',R:'#E84D9A'}},
  gold:{name:'Golden',cost:400,colors:{...PAL_HERO,U:'#D18B00',R:'#FFD23F'}}
};
const heroSprite=scale=>save.theme==='voltage'?sprite(VOLTLING,PAL_VOLTLING,scale):sprite(HERO,SKINS[save.skin]?.colors||PAL_HERO,scale);
function applySettings(){
  document.documentElement.style.setProperty('--font-scale',save.fontScale);
  document.documentElement.dataset.theme=save.theme;
  sfxVolume=save.sfxVolume;syncMusic();
}

/* ---------- state ---------- */
const app=$('#app');
let P=null; // current level / play state

function hud(){
  $('#hCoins').textContent=save.coins+(P&&P.coins?P.coins:0);
  $('#hStars').textContent=totalStars();
  $('#hStarIco').innerHTML=sprite(STAR,{Y:'#FFC83D'},2);
  $('#mute').textContent=save.muted?'Sound off':'Sound on';
}
const heartsHTML=n=>[0,1,2].map(i=>sprite(HEART,{R:i<n?'#FF3B3B':'#4A4A6A'},3)).join('');
function setHearts(n){$('#hearts').innerHTML=heartsHTML(n);$('#hearts').setAttribute('aria-label',`${n} hearts left`);}
function clearHearts(){$('#hearts').innerHTML='';$('#hearts').setAttribute('aria-label','No active level');}

/* ---------- screens ---------- */
function showTitle(){
  P=null;$('#hud').hidden=true;clearHearts();
  const returning=totalStars()>0||save.coins>0;
  app.innerHTML=`
  <div class="titlewrap">
    <div class="sky">
      <i class="cloud" style="top:70px;left:6%"></i>
      <i class="cloud" style="top:150px;right:8%;transform:scale(.7)"></i>
      <h1 class="logo"><span>CODE</span><span>QUEST</span></h1>
      <p class="sub">Learn to code. Stomp the bugs. Collect the coins.</p>
      <div class="scene">
        <div class="qb tblock">?</div>
        <i class="tcoin"></i>
        <div class="thero" id="mascot">${heroSprite(6)}</div>
        <div class="tbug">${sprite(BUG,PAL_BUG,4)}</div>
        <div class="tpipe"></div>
      </div>
      ${save.theme==='voltage'?'<div class="mascot-controls" aria-label="Mascot animation controls"><button class="btn ghost small" data-act="mascot-toggle" aria-pressed="true">Pause mascot</button><button class="btn go small" data-act="mascot-jump">Jump!</button></div>':''}
    </div>
    <div class="under">
      <div class="menu">
        ${TEST_MODE?'<p class="test-banner" role="status">TEST MODE · 10,000 coins · separate test save</p>':''}
        <label>Your name<input id="nameIn" maxlength="12" autocomplete="off" placeholder="Player" value="${esc(save.name)}"></label>
        <button class="btn go big" data-act="start">${returning?'Continue':'Press start'}</button>
        <button class="btn ghost small" data-act="settings">Settings</button>
        <p class="note">20 levels across 5 worlds: HTML, CSS, JavaScript, Python and C++.</p>
      </div>
    </div>
  </div>`;
  window.scrollTo(0,0);
}

function showMap(completion=null){
  P=null;$('#hud').hidden=false;clearHearts();hud();
  app.innerHTML=`<section class="screen">
    <h2 class="h">World map</h2>
    ${TEST_MODE?'<p class="test-banner" role="status">TEST MODE · Your progress and purchases use a separate test save. The regular save is untouched.</p>':''}
    <p class="lead">Hi ${esc(save.name||'Player')}! ${save.guided?'Finish every level in a world to unlock the next world.':'Explore any world; earn a star to open the next level.'}</p>
    ${completion?`<div class="map-notice${completion.saveError?' save-error':''}" role="status"><b>${completion.practice?'Practice complete!':`Level ${completion.w+1}-${completion.l+1} complete!`}</b><p>${completion.practice?'Practice earns no coins or progress.':`You earned ${completion.stars} star${completion.stars===1?'':'s'} and ${completion.total} coins.`}</p><p>${completion.practice?'Choose any level to keep practicing.':completion.saveError?'Browser storage failed. Download a backup below to keep your progress.':'Your progress is saved. Select an unlocked level below to continue.'}</p></div>`:''}
    ${WORLDS.map(worldCard).join('')}
    <div class="save-tools">
      <p>Your progress saves automatically in this browser. Download a backup to keep it or move it to another device; you can attach that file to an email yourself.</p>
      <button class="btn ghost small" data-act="export">Download save backup</button>
      <button class="btn ghost small" data-act="importpick">Restore save backup</button>
      <input id="saveFile" type="file" accept="application/json,.json" hidden aria-label="Choose a Code Quest save backup">
    </div>
    <div class="foot"><button class="btn ghost small" data-act="shop">Character shop</button> <button class="btn go small" data-act="theme-shop">Themes store</button> <button class="btn ghost small" data-act="settings">Settings</button> <button class="btn ghost small" data-act="reset">Reset progress</button></div>
  </section>`;
  window.scrollTo(0,0);
}
function worldCard(w,wi){
  const got=w.levels.reduce((a,_,li)=>a+starsOf(wi,li),0);
  return `<section class="world" style="${theme(w)}">
    <header><div><span class="wn">World ${wi+1}</span><h3>${esc(w.name)}</h3><p>${esc(w.title)}: ${esc(w.blurb)}</p></div>
    <div class="wstars">${sprite(STAR,{Y:'#FFC83D'},3)} ${got}/${w.levels.length*3}</div></header>
    <div class="path">${w.levels.map((L,li)=>levelNode(wi,L,li)).join('')}</div>
  </section>`;
}
function levelNode(wi,L,li){
  const ok=unlocked(wi,li),s=starsOf(wi,li);
  return `<button class="node${ok?'':' locked'}" data-act="node" data-w="${wi}" data-l="${li}" ${ok?'':'disabled'} aria-label="Level ${wi+1}-${li+1}, ${esc(L.n)}${ok?'':', locked'}">
    <span class="dot">${ok?`${wi+1}-${li+1}`:'&#128274;'}</span>
    <span class="ns">${[1,2,3].map(i=>sprite(STAR,{Y:i<=s?'#FFC83D':'#C9C2AE'},2)).join('')}</span>
    <span class="nm">${esc(L.n)}</span></button>`;
}

function showLesson(w,l){
  const W=WORLDS[w],L=W.levels[l];P={w,l};$('#hud').hidden=false;clearHearts();hud();
  app.innerHTML=`<section class="screen" style="${theme(W)}">
    <button class="back" data-act="map">&#9664; World map</button>
    <div class="lhead"><span class="ln">Level ${w+1}-${l+1}: ${esc(W.name)}</span><h2 class="h">${esc(L.n)}</h2></div>
    <div class="power"><div class="ptag">Power-up</div><p>${esc(L.l)}</p><pre class="code">${hl(L.c,W.lang)}</pre></div>
    <p class="lead">${L.ch.length} challenges ahead. In adventure mode, wrong answers cost a heart. Practice mode has no heart loss and earns no rewards.</p>
    <div class="stack"><button class="btn go big" data-act="play" data-practice="false">Start adventure &#9654;</button><button class="btn ghost" data-act="play" data-practice="true">Practice without pressure</button>${[0,1,2].includes(w)?'<button class="btn ghost" data-act="lab">Open code lab</button>':''}</div>
  </section>`;
  window.scrollTo(0,0);
}

function startPlay(w,l,practice=false){
  const W=WORLDS[w],L=W.levels[l],N=L.ch.length;
  P={w,l,i:0,hearts:3,coins:0,busy:false,over:false,solved:false,practice,bx:L.ch.map((_,i)=>Math.round(20+i*(60/(N-1))))};
  $('#hud').hidden=false;setHearts(3);hud();
  app.innerHTML=`<section class="screen" style="${theme(W)}">
    <div class="lvlbar"><span><b>${w+1}-${l+1}</b>${esc(L.n)}</span><button class="mini" data-act="peek">Lesson</button></div>
    <div class="track${W.dark?' dark':''}" id="track">
      <i class="cloud" style="left:10%;top:26px"></i><i class="cloud" style="left:64%;top:54px;transform:scale(.75)"></i>
      <i class="hill h1"></i><i class="hill h2"></i>
      ${P.bx.map((x,i)=>`<div class="qb blk" id="b${i}" style="left:${x}%">?</div>`).join('')}
      <div class="flag" id="flag" style="left:92%"><i class="pole"></i><i class="cloth"></i></div>
      <i class="track-bug" id="trackBug" style="left:66%" aria-label="A bug is wriggling on the track">${sprite(BUG,PAL_BUG,3)}</i>
      <div class="hero" id="hero" style="left:5%">${heroSprite(4)}</div>
      <div class="ground"></div>
    </div>
    <div class="track-controls" aria-label="Character controls">
      <button class="mini" data-act="move" data-dir="-1" aria-label="Move left">◀</button><button class="mini" data-act="move" data-dir="1" aria-label="Move right">▶</button><button class="mini" data-act="jump" aria-label="Jump">Jump</button>
    </div>
    <p class="track-help" id="trackHelp">Use ←/→ to move and Space/↑ to jump. Jump on the bug to stomp it for 10 coins.</p>
    <div class="panel" id="panel"></div>
  </section>`;
  renderChallenge();
  window.scrollTo(0,0);
}

/* ---------- challenges ---------- */
function renderChallenge(){
  const W=WORLDS[P.w],L=W.levels[P.l],C=L.ch[P.i];
  P.c=C;P.tries=0;P.hints=0;P.solved=false;P.busy=false;
  const kind=C.t==='mc'?C.k:C.t;
  const K={q:['?','Question block'],out:['&#9654;','Predict the output'],bug:['!','Bug hunt'],ty:['&hellip;','Type the missing code'],od:['&#9638;','Brick builder']}[kind];
  let body='';
  if(C.t==='mc'){
    P.order=shuffle(C.o.map((_,i)=>i));
    body=`<div class="opts">${P.order.map((oi,n)=>`<button class="opt" data-act="opt" data-o="${oi}"><span class="k">${n+1}</span><span>${esc(C.o[oi])}</span></button>`).join('')}</div>`;
  }else if(C.t==='ty'){
    body=`<div class="tyrow"><input class="tyin" id="tyin" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Type here" aria-label="Your answer"><button class="btn go" data-act="tycheck">Check</button></div>`;
  }else{
    body=`<div class="lbl">Your code</div><div class="dz" id="dz"></div>
      <div class="lbl">Lines to place</div><div class="pool" id="pool"></div>
      <div class="odbtns"><button class="btn go" id="ck" data-act="ocheck" disabled>Check</button><button class="btn ghost" data-act="oclear">Start over</button></div>`;
  }
  $('#panel').innerHTML=`<div class="phead"><span class="pbadge">${K[0]}</span><span class="ptitle">${K[1]}</span><span class="pcount">${P.i+1}/${L.ch.length}</span></div>
    <p class="q" id="question" tabindex="-1">${esc(C.q)}</p>${C.code?`<pre class="code">${hl(C.code,W.lang)}</pre>`:''}${body}
    <button class="btn ghost small hint-btn" data-act="hint" aria-describedby="hintText">Need a hint?</button><p class="hint-text" id="hintText" aria-live="polite"></p>
    <div id="fb" aria-live="polite"></div><div id="nx"></div>`;
  if(C.t==='od'){
    let pool=C.lines.map((t,i)=>({id:i,t})),tries=0;
    do{pool=shuffle(pool);tries++;}while(pool.every((c,i)=>c.id===i)&&tries<10);
    P.pool=pool;P.ans=[];drawOd();
  }
}
function drawOd(){
  const lang=WORLDS[P.w].lang,done=P.solved;
  $('#dz').innerHTML=P.ans.length
    ?P.ans.map((c,n)=>`<button class="chip" data-act="back" data-n="${n}" ${done?'disabled':''}><span class="ln">${n+1}</span><span>${hl(c.t,lang)}</span></button>`).join('')
    :'<p class="empty">Tap the lines below to build your code here.</p>';
  $('#pool').innerHTML=P.pool.map((c,n)=>`<button class="chip" data-act="pick" data-n="${n}" ${done?'disabled':''}>${hl(c.t,lang)}</button>`).join('');
  const ck=$('#ck');if(ck)ck.disabled=done||P.pool.length>0;
}
function fb(good,msg){
  $('#fb').innerHTML=`<div class="fb ${good?'good':'bad'}"><b>${good?'Correct!':'Oops!'}</b>${esc(msg)}</div>`;
}

async function onCorrect(){
  if(P.solved||P.over)return;
  P.solved=true;P.busy=true;
  const first=P.tries===0,gain=P.practice?0:first?15:10;
  P.coins+=gain;hud();
  fb(true,P.practice?`Correct! ${P.c.e}`:`${first?'First try! ':''}+${gain} coins. ${P.c.e}`);
  const L=WORLDS[P.w].levels[P.l],last=P.i===L.ch.length-1;
  if(P.c.t==='od')drawOd();
  await celebrate(P.i);
  P.busy=false;
  $('#nx').innerHTML=`<button class="btn go" data-act="nextc">${last?'Finish level':'Next'} &#9654;</button>`;
  const nb=$('#nx .btn');if(nb)nb.focus({preventScroll:true});
}
async function onWrong(msg){
  P.tries++;
  if(!P.practice)P.hearts--;
  setHearts(Math.max(0,P.hearts));
  sfx.wrong();hurt();
  fb(false,P.practice?`${msg} Practice mode: no heart lost.`:`${msg} You lost a heart.`);
  if(!P.practice&&P.hearts<=0){
    P.over=true;
    document.querySelectorAll('#panel button, #panel input').forEach(b=>b.disabled=true);
    await sleep(900);gameOver();
  }
}
async function celebrate(i){
  const hero=$('#hero'),blk=$('#b'+i);if(!hero||!blk)return;
  hero.style.left=P.bx[i]+'%';hero.classList.add('run');
  await sleep(650);hero.classList.remove('run');
  hero.classList.add('jump');sfx.jump();
  await sleep(220);
  blk.classList.add('bump','used');blk.textContent='';sfx.coin();popCoin(i);
  await sleep(330);hero.classList.remove('jump');
}
function popCoin(i){
  const c=document.createElement('i');c.className='coinpop';c.style.left=P.bx[i]+'%';
  $('#track').appendChild(c);setTimeout(()=>c.remove(),900);
}
function hurt(){
  const h=$('#hero'),t=$('#track');if(!h||!t)return;
  h.classList.remove('hurt');void h.offsetWidth;h.classList.add('hurt');
  const b=document.createElement('div');b.className='bugpop';
  b.style.left=Math.min(96,parseFloat(h.style.left)+10)+'%';b.innerHTML=sprite(BUG,PAL_BUG,3);
  t.appendChild(b);setTimeout(()=>{b.remove();h.classList.remove('hurt');},900);
}
function checkTrackContact(jumping=false){
  if(!P||P.solved||!$('#hero'))return;
  const hero=$('#hero'),x=parseFloat(hero.style.left),bug=$('#trackBug');
  if(bug&&!bug.hidden&&Math.abs(x-66)<7){
    if(jumping){
      bug.hidden=true;P.coins+=10;hud();sfx.coin();
      $('#trackHelp').textContent='Bug stomped! +10 coins. Keep solving challenges!';
    }else if(!P.hurtCooldown){
      P.hurtCooldown=true;
      onWrong('The bug got you on the track.');
      setTimeout(()=>{if(P)P.hurtCooldown=false;},1200);
    }
  }
}
function moveHero(direction){
  if(!P||P.busy||P.solved||P.over||!$('#hero'))return;
  const hero=$('#hero'),x=Math.max(5,Math.min(90,parseFloat(hero.style.left)+direction*4));
  hero.style.left=x+'%';hero.classList.add('run');
  setTimeout(()=>hero.classList.remove('run'),180);
  checkTrackContact(false);
}
function jumpHero(){
  if(!P||P.busy||P.solved||P.over||!$('#hero'))return;
  const hero=$('#hero');hero.classList.add('jump');sfx.jump();
  checkTrackContact(true);
  setTimeout(()=>hero.classList.remove('jump'),500);
}

function showHint(){
  if(!P||P.solved||P.over)return;
  P.hints++;
  const C=P.c,step=P.hints;
  let text=C.e;
  if(C.t==='mc'){
    const wrong=[...document.querySelectorAll('.opt:not(:disabled)')].filter(b=>+b.dataset.o!==C.a);
    if(wrong.length){wrong[wrong.length-1].disabled=true;text=`One choice ruled out. ${C.e}`;}
  }else if(C.t==='ty'){
    const answer=C.ok[0];
    text=step===1?`The answer has ${answer.length} characters and begins with "${answer[0]}".`:step===2?`The answer is: ${answer}`:`Remember: ${answer}`;
  }else{
    const missing=C.lines[P.ans.length];
    text=missing?`The next line should be: ${missing}`:`All lines are in place; check their order.`;
  }
  $('#hintText').textContent=`Hint ${step}: ${text}`;
}

function openLab(){
  if(!P||P.w>2)return;
  const W=WORLDS[P.w],lang=W.lang;
  const starter=lang==='js'?'console.log("READY");':
    lang==='css'?'body {\n  background: lightblue;\n  color: navy;\n}':
    '<h1>Hello, coder!</h1>\n<p>Edit this page, then preview it.</p>';
  const content=lang==='js'
    ?`<p class="lab-task">Task: make your program print exactly <code>READY</code>. Run it to check the test.</p><label class="lab-label" for="labCode">JavaScript</label><textarea id="labCode" class="lab-editor" spellcheck="false" aria-label="JavaScript code">${esc(starter)}</textarea><button class="btn go" data-act="labrun">Run code and test</button><pre id="labOutput" class="lab-output" aria-live="polite">Test output will appear here.</pre>`
    :lang==='css'
      ?`<label class="lab-label" for="labCode">CSS</label><textarea id="labCode" class="lab-editor" spellcheck="false" aria-label="CSS code">${esc(starter)}</textarea><button class="btn go" data-act="labrun">Preview style</button><iframe id="labPreview" class="lab-preview" title="CSS preview" sandbox=""></iframe>`
      :`<label class="lab-label" for="labCode">HTML</label><textarea id="labCode" class="lab-editor" spellcheck="false" aria-label="HTML code">${esc(starter)}</textarea><button class="btn go" data-act="labrun">Preview page</button><iframe id="labPreview" class="lab-preview" title="HTML preview" sandbox=""></iframe>`;
  openModal(`<h3>Code lab: ${esc(W.name)}</h3><p>Try your own code. JavaScript runs in a separate worker with a 2-second limit; HTML and CSS preview in a sandboxed frame.</p>${content}<div class="mbtns"><button class="btn ghost" data-act="close">Close lab</button></div>`);
}
function runLab(){
  const code=$('#labCode')?.value;
  if(code===undefined)return;
  const lang=WORLDS[P.w].lang;
  if(lang==='html'){
    $('#labPreview').srcdoc=`<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:"><body>${code}</body>`;
  }else if(lang==='css'){
    $('#labPreview').srcdoc=`<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><style>${code}</style><body><h1>Code Quest</h1><p>Preview your CSS here.</p><button>Sample button</button></body>`;
  }else{
    const output=$('#labOutput');output.textContent='Running…';
    let worker,url,timer;
    try{
      const source=`
        const code=${JSON.stringify(code)};
        const logs=[];
        const record=values=>{
          if(logs.length>=50)return;
          logs.push(values.map(value=>{
            try{return typeof value==='string'?value:JSON.stringify(value)}
            catch{return String(value)}
          }).join(' ').slice(0,500));
        };
        const safeConsole={log:(...values)=>record(values),error:(...values)=>record(values)};
        try{
          new Function('console','fetch','XMLHttpRequest','WebSocket',code)(safeConsole,undefined,undefined,undefined);
          postMessage({logs,passed:logs.join('\\n')==='READY'});
        }catch(error){postMessage({error:String(error)})}
      `;
      url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
      worker=new Worker(url);
      timer=setTimeout(()=>{worker.terminate();URL.revokeObjectURL(url);output.textContent='Stopped: code ran for too long (2 second limit).';},2000);
      worker.onmessage=e=>{
        clearTimeout(timer);worker.terminate();URL.revokeObjectURL(url);
        output.textContent=e.data.error?`Error: ${e.data.error}`:`${e.data.passed?'Test passed!':'Test failed: expected the output READY.'}\n${e.data.logs.join('\n')||'No console output.'}`;
      };
      worker.onerror=e=>{
        clearTimeout(timer);worker.terminate();URL.revokeObjectURL(url);
        output.textContent=`Could not run code: ${e.message}`;
      };
    }catch(e){
      if(timer)clearTimeout(timer);
      if(worker)worker.terminate();
      if(url)URL.revokeObjectURL(url);
      output.textContent=`Could not start the JavaScript worker: ${e.message}`;
    }
  }
}

function showSettings(){
  openModal(`<h3>Settings</h3>
    <label class="setting-row">Text size <select id="settingFont"><option value="0.9" ${save.fontScale===.9?'selected':''}>Small</option><option value="1" ${save.fontScale===1?'selected':''}>Default</option><option value="1.15" ${save.fontScale===1.15?'selected':''}>Large</option><option value="1.3" ${save.fontScale===1.3?'selected':''}>Extra large</option></select></label>
    <label class="setting-row"><input id="settingGuided" type="checkbox" ${save.guided?'checked':''}> Guided progression (finish each world to unlock the next)</label>
    <label class="setting-row"><input id="settingMuted" type="checkbox" ${save.muted?'checked':''}> Mute sound effects</label>
    <label class="setting-row">Sound effect volume <input id="settingVolume" type="range" min="0" max="1" step="0.1" value="${save.sfxVolume}"></label>
    <label class="setting-row"><input id="settingMusicMuted" type="checkbox" ${save.musicMuted?'checked':''}> Mute background music</label>
    <label class="setting-row">Music volume <input id="settingMusicVolume" type="range" min="0" max="1" step="0.1" value="${save.musicVolume}"></label>
    <div class="mbtns"><button class="btn go" data-act="settingssave">Save settings</button><button class="btn ghost" data-act="close">Cancel</button></div>`);
}
function showShop(){
  const items=Object.entries(SKINS).map(([id,s])=>{
    const owned=save.skins.includes(id);
    return `<div class="shop-item"><div class="shop-preview">${sprite(HERO,s.colors,3)}</div><b>${esc(s.name)}</b><span>${owned?'Owned':`${s.cost} coins`}</span><button class="btn ${owned?'ghost':'go'} small" data-act="skin" data-skin="${id}" ${!owned&&save.coins<s.cost?'disabled':''}>${save.skin===id?'Equipped':owned?'Equip':'Buy'}</button></div>`;
  }).join('');
  openModal(`<h3>Coin shop</h3><p>You have ${save.coins} coins. Unlock a look, then equip it.</p><div class="shop-grid">${items}</div><div class="mbtns"><button class="btn ghost" data-act="shopclose">Back to map</button></div>`);
}
function showThemeShop(){
  const items=Object.entries(THEMES).map(([id,themeInfo])=>{
    const owned=save.themes.includes(id);
    const preview=id==='voltage'?sprite(VOLTLING,PAL_VOLTLING,5):sprite(HERO,PAL_HERO,5);
    return `<div class="theme-item"><div class="theme-preview">${preview}</div><b>${esc(themeInfo.name)}</b><p>${esc(themeInfo.description)}</p><span>${owned?'Owned':`${themeInfo.cost} coins`}</span><button class="btn ${owned?'ghost':'go'} small" data-act="theme" data-theme="${id}" ${!owned&&save.coins<themeInfo.cost?'disabled':''}>${save.theme===id?'Equipped':owned?'Equip':'Unlock'}</button></div>`;
  }).join('');
  openModal(`<h3>Themes store</h3><p>You have ${save.coins} coins. Theme unlocks are permanent and can be equipped again for free.</p><div class="theme-grid">${items}</div><div class="mbtns"><button class="btn ghost" data-act="shopclose">Back to map</button></div>`);
}
function exportSave(){
  try{
    const payload={format:'code-quest-save',version:1,exportedAt:new Date().toISOString(),data:save};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download='code-quest-save.json';document.body.appendChild(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    openModal('<h3>Backup downloaded</h3><p>Your save file is ready. Keep it somewhere safe or attach it to an email to transfer it yourself.</p><div class="mbtns"><button class="btn go" data-act="close">Back to map</button></div>');
  }catch(error){
    openModal(`<h3>Could not create backup</h3><p>${esc(error.message||'Your browser could not download the save file.')}</p><div class="mbtns"><button class="btn ghost" data-act="close">Back to map</button></div>`);
  }
}
function validateSaveFile(payload){
  if(!payload||payload.format!=='code-quest-save'||payload.version!==1||!payload.data||typeof payload.data!=='object')
    throw new Error('This is not a supported Code Quest save backup.');
  const data=payload.data;
  if(!Number.isSafeInteger(data.coins)||data.coins<0)throw new Error('The save file has an invalid coin balance.');
  if(typeof data.name!=='string'||data.name.length>12)throw new Error('The save file has an invalid player name.');
  if(!data.stars||typeof data.stars!=='object'||Array.isArray(data.stars))throw new Error('The save file has invalid level progress.');
  const stars={};
  for(const [level,value] of Object.entries(data.stars)){
    const match=/^(\d+)-(\d+)$/.exec(level),w=match?Number(match[1]):-1,l=match?Number(match[2]):-1;
    if(w<0||w>=WORLDS.length||l<0||l>=WORLDS[w].levels.length||!Number.isInteger(value)||value<1||value>3)
      throw new Error('The save file contains invalid star data.');
    stars[level]=value;
  }
  if(!Array.isArray(data.skins)||!data.skins.includes('classic')||data.skins.some(id=>!Object.hasOwn(SKINS,id)))
    throw new Error('The save file contains an unknown character skin.');
  if(!data.skins.includes(data.skin))throw new Error('The equipped skin is not owned in this save file.');
  const themes=Array.isArray(data.themes)?data.themes:['classic'];
  const equippedTheme=data.theme||'classic';
  if(!themes.includes('classic')||themes.some(id=>!Object.hasOwn(THEMES,id))||!themes.includes(equippedTheme))
    throw new Error('The save file contains invalid theme ownership data.');
  if(typeof data.guided!=='boolean'||typeof data.muted!=='boolean'||typeof data.musicMuted!=='boolean')
    throw new Error('The save file contains invalid game settings.');
  if(![.9,1,1.15,1.3].includes(data.fontScale))throw new Error('The save file contains an invalid text size.');
  if(!Number.isFinite(data.sfxVolume)||data.sfxVolume<0||data.sfxVolume>1||!Number.isFinite(data.musicVolume)||data.musicVolume<0||data.musicVolume>1)
    throw new Error('The save file contains invalid audio settings.');
  return {...DEF,...data,stars,skins:[...new Set(data.skins)],themes:[...new Set(themes)],theme:equippedTheme};
}
let pendingSaveImport=null;
async function readSaveFile(file){
  if(!file)return;
  try{
    if(file.size>1024*1024)throw new Error('Save files must be smaller than 1 MB.');
    const imported=validateSaveFile(JSON.parse(await file.text()));
    pendingSaveImport=imported;
    openModal(`<h3>Restore this backup?</h3><p>This replaces the current save in this browser with the backup for ${esc(imported.name||'Player')}, including ${Object.keys(imported.stars).length} completed levels and ${imported.coins} coins.</p><p>Your current save cannot be merged or recovered unless you download a backup first.</p><div class="mbtns"><button class="btn go" data-act="importconfirm">Replace current save</button><button class="btn ghost" data-act="close">Cancel</button></div>`);
  }catch(error){
    pendingSaveImport=null;
    openModal(`<h3>Could not restore backup</h3><p>${esc(error.message||'The selected file could not be read.')}</p><div class="mbtns"><button class="btn ghost" data-act="close">Back to map</button></div>`);
  }
}

async function finishLevel(){
  P.busy=true;
  const hero=$('#hero');hero.style.left='92%';hero.classList.add('run');
  await sleep(850);hero.classList.remove('run');hero.classList.add('jump');
  $('#flag').classList.add('down');sfx.win();
  await sleep(1200);
  const stars=P.practice?0:Math.max(1,P.hearts),bonus=stars*10,total=P.practice?0:P.coins+bonus;
  let saveError=false;
  if(!P.practice){
    save.coins+=total;
    const k=key(P.w,P.l);save.stars[k]=Math.max(save.stars[k]||0,stars);saveError=!persist();
  }
  const completion={w:P.w,l:P.l,practice:P.practice,stars,total,saveError};
  P.coins=0;
  sfx.coin();
  showMap(completion);
}

/* ---------- modal ---------- */
let modalLocked=false;
let modalReturnFocus=null;
function openModal(html,locked){
  modalReturnFocus=document.activeElement;
  modalLocked=!!locked;$('#mbox').innerHTML=html;$('#modal').hidden=false;
  const b=$('#mbox .btn');if(b)b.focus();else $('#mbox').focus();
}
function closeModal(){
  $('#modal').hidden=true;$('#mbox').innerHTML='';modalLocked=false;
  if(modalReturnFocus?.isConnected)modalReturnFocus.focus();
  modalReturnFocus=null;
}
function gameOver(){
  sfx.over();
  openModal(`<h3>Game over</h3><div class="mhero dead">${heroSprite(5)}</div>
    <p>The bugs got you this time. Read the lesson again and give it another go!</p>
    <div class="mbtns"><button class="btn go" data-act="again">Try again</button><button class="btn ghost" data-act="map">World map</button></div>`,true);
}
function peekLesson(){
  const W=WORLDS[P.w],L=W.levels[P.l];
  openModal(`<h3>${esc(L.n)}</h3><p>${esc(L.l)}</p><pre class="code">${hl(L.c,W.lang)}</pre><div class="mbtns"><button class="btn go" data-act="close">Back to the level</button></div>`);
}

/* ---------- events ---------- */
document.addEventListener('click',e=>{
  ac();
  syncMusic();
  const el=e.target.closest('[data-act]');if(!el||el.disabled)return;
  const act=el.dataset.act;
  if(act!=='opt'&&act!=='pick'&&act!=='back')sfx.click();
  switch(act){
    case 'start':{const v=($('#nameIn').value||'').trim();if(v)save.name=v;persist();showMap();break;}
    case 'settings':showSettings();break;
    case 'settingssave':{
      const wasTitle=!!$('.titlewrap'),wasMap=!!$('.world');
      save.fontScale=Number($('#settingFont').value);
      save.guided=$('#settingGuided').checked;save.muted=$('#settingMuted').checked;
      save.musicMuted=$('#settingMusicMuted').checked;
      save.sfxVolume=Number($('#settingVolume').value);save.musicVolume=Number($('#settingMusicVolume').value);
      applySettings();persist();closeModal();
      if(wasTitle)showTitle();else if(wasMap)showMap();
      break;
    }
    case 'shop':showShop();break;
    case 'theme-shop':showThemeShop();break;
    case 'shopclose':closeModal();showMap();break;
    case 'export':exportSave();break;
    case 'importpick':$('#saveFile').click();break;
    case 'importconfirm':{
      if(!pendingSaveImport)break;
      save=pendingSaveImport;pendingSaveImport=null;applySettings();
      const stored=persist();closeModal();showMap();
      if(!stored)openModal('<h3>Backup restored for this session</h3><p>Browser storage is unavailable, so the restored save may be lost when you close this page. Download a backup to keep it.</p><div class="mbtns"><button class="btn go" data-act="close">Back to map</button></div>');
      break;
    }
    case 'skin':{
      const id=el.dataset.skin,skin=SKINS[id];
      if(!skin)break;
      if(!save.skins.includes(id)){
        if(save.coins<skin.cost)break;
        save.coins-=skin.cost;save.skins.push(id);
      }
      save.skin=id;persist();showShop();break;
    }
    case 'theme':{
      const id=el.dataset.theme,themeInfo=THEMES[id];
      if(!themeInfo)break;
      if(!save.themes.includes(id)){
        if(save.coins<themeInfo.cost)break;
        save.coins-=themeInfo.cost;save.themes.push(id);
      }
      save.theme=id;
      const stored=persist();
      applySettings();closeModal();showMap();
      if(!stored)openModal('<h3>Theme equipped temporarily</h3><p>Browser storage is unavailable, so this theme and purchase may not be saved after you close the game. Download a save backup from the map to keep your progress.</p><div class="mbtns"><button class="btn go" data-act="close">Back to map</button></div>');
      break;
    }
    case 'mascot-toggle':{
      const mascot=$('#mascot');
      if(!mascot)break;
      const playing=mascot.dataset.playing!=='false';
      mascot.dataset.playing=playing?'false':'true';
      el.setAttribute('aria-pressed',String(!playing));
      el.textContent=playing?'Play mascot':'Pause mascot';
      break;
    }
    case 'mascot-jump':{
      const mascot=$('#mascot');
      if(!mascot)break;
      mascot.classList.remove('mascot-jumping');void mascot.offsetWidth;mascot.classList.add('mascot-jumping');
      setTimeout(()=>mascot.classList.remove('mascot-jumping'),650);
      sfx.jump();break;
    }
    case 'map':closeModal();showMap();break;
    case 'node':{const w=+el.dataset.w,l=+el.dataset.l;if(unlocked(w,l))showLesson(w,l);break;}
    case 'play':startPlay(P.w,P.l,el.dataset.practice==='true');break;
    case 'again':{const w=P.w,l=P.l;closeModal();startPlay(w,l);break;}
    case 'peek':peekLesson();break;
    case 'lab':openLab();break;
    case 'labrun':runLab();break;
    case 'hint':showHint();break;
    case 'move':moveHero(+el.dataset.dir);break;
    case 'jump':jumpHero();break;
    case 'close':pendingSaveImport=null;closeModal();break;
    case 'mute':save.muted=!save.muted;persist();hud();break;
    case 'reset':openModal(`<h3>Reset progress?</h3><p>This clears all your coins and stars.</p><div class="mbtns"><button class="btn" data-act="resetyes">Yes, reset</button><button class="btn ghost" data-act="close">Keep playing</button></div>`);break;
    case 'resetyes':save=Object.assign({},save,{coins:0,stars:{}});persist();closeModal();showMap();break;
    case 'opt':{
      if(!P||P.busy||P.solved||P.over)break;
      const oi=+el.dataset.o;
      if(oi===P.c.a){
        el.classList.add('good');
        document.querySelectorAll('.opt').forEach(b=>b.disabled=true);
        onCorrect();
      }else{
        el.classList.add('bad');el.disabled=true;
        onWrong('Not quite. Pick another answer.');
      }
      break;
    }
    case 'tycheck':checkTyped();break;
    case 'pick':{
      if(!P||P.busy||P.solved||P.over)break;
      sfx.click();
      P.ans.push(P.pool.splice(+el.dataset.n,1)[0]);drawOd();break;
    }
    case 'back':{
      if(!P||P.busy||P.solved||P.over)break;
      sfx.click();
      P.pool.push(P.ans.splice(+el.dataset.n,1)[0]);drawOd();break;
    }
    case 'oclear':{
      if(!P||P.busy||P.solved||P.over)break;
      P.pool=P.pool.concat(P.ans);P.ans=[];drawOd();break;
    }
    case 'ocheck':{
      if(!P||P.busy||P.solved||P.over)break;
      const want=P.c.lines;let j=-1;
      for(let i=0;i<want.length;i++){if(P.ans[i].t!==want[i]){j=i;break;}}
      if(j===-1)onCorrect();
      else{P.pool=P.pool.concat(P.ans.splice(j));drawOd();onWrong(`Line ${j+1} doesn't fit there yet.`);}
      break;
    }
    case 'nextc':{
      const L=WORLDS[P.w].levels[P.l];
      if(P.i===L.ch.length-1)finishLevel();
      else{P.i++;renderChallenge();window.scrollTo({top:0,behavior:'smooth'});}
      break;
    }
  }
});
document.addEventListener('change',e=>{
  if(e.target.id==='saveFile'){
    const file=e.target.files?.[0];
    readSaveFile(file);
    e.target.value='';
  }
});

function checkTyped(){
  if(!P||P.busy||P.solved||P.over)return;
  const inp=$('#tyin'),v=inp.value;if(!v.trim())return;
  if(P.c.ok.some(a=>norm(a)===norm(v))){inp.disabled=true;$('#panel .btn[data-act="tycheck"]').disabled=true;onCorrect();}
  else{
    let m='That is not it. Check the code and try again.';
    if(P.tries>=1){const a=P.c.ok[0];m+=` Hint: the answer is ${a.length} characters long and starts with "${a[0]}".`;}
    onWrong(m);inp.select();
  }
}
document.addEventListener('keydown',e=>{
  if(!$('#modal').hidden){
    if(e.key==='Escape'&&!modalLocked){closeModal();return;}
    if(e.key==='Tab'){
      const items=[...$('#mbox').querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),iframe')].filter(x=>x.offsetParent!==null);
      if(items.length){
        const first=items[0],last=items[items.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
      }
    }
    return;
  }
  if(P&&['ArrowLeft','ArrowRight','ArrowUp',' '].includes(e.key)&&!['INPUT','TEXTAREA','SELECT','BUTTON'].includes(e.target.tagName)){
    e.preventDefault();
    if(e.key==='ArrowLeft')moveHero(-1);
    else if(e.key==='ArrowRight')moveHero(1);
    else jumpHero();
  }
  if(e.key==='Enter'&&e.target&&e.target.id==='tyin'){e.preventDefault();checkTyped();return;}
  if(!P||!P.c||P.c.t!=='mc'||P.busy||P.solved||P.over||!$('#modal').hidden)return;
  const n=parseInt(e.key,10);
  if(n>=1&&n<=P.order.length){
    const b=document.querySelector(`.opt[data-o="${P.order[n-1]}"]`);
    if(b&&!b.disabled)b.click();
  }
});

/* ---------- go! ---------- */
applySettings();
showTitle();
