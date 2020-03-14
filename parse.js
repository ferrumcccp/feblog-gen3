/* Tag Format
{
name: Tag Name,
arg: Arguments,
is_close_tag: Whether it is a closing tag,
is_clopen_tag: Whether it is a tag that closes the previous node
	and opens another one(TODO, my own extention),
inner: text between the open tag and the close tag,
inner_raw: unrendered text
inner_res: rendered html. When there are multiple functions 
associated to a tag, it is undefined for the first one, and
the previous result for others.
}
Tag Definition Format
{
raw: If true, do not parse inner text.
raw_html: It true, do not escape inner HTML.
singleline: If true, the node should be closed automatically 
	when the line breaks.
	Note: A node can have multiple lines if singleline is disabled,
	but a tag itself should alsways be singlelined.
unpaired: If true, the tag doesn't need to be closed
comp: function(tag) forrendering the node
}
P.result: Result
P.outfunc: Output function used when provided
P.stack: stack
tags: Table of tag definition
*/

// tmp vars used in parser
var tags={}
var fs=require("fs")

function P(){
	this.curtag="";
	this.curstr="";
	this.stack=[];
	this.result="";
}

function amp(s){
    let t="";
    for(let i=0;i<s.length;i++){
        if(s[i]=="\"")t+="&quot;";
        else if(s[i]==" ")t+=" ";
        else if(s[i]=="&")t+="&amp;";
        else if(s[i]=="<")t+="&lt;";
        else if(s[i]==">")t+="&gt;";
        else t+=s[i];
    }
    return t;
}
// Add parsed string to the current top of the stack
// If the stack is empty, output that.
P.prototype.add_string=function(s,sraw){
	sraw=sraw||s;
	// Toplevel
	if(this.stack.length==0){
		if(this.outfunc)this.outfunc(amp(s));
		else P.result+=amp(s);
		return;
	}
	// HTML escape
	if(!tags[s].raw_html){
		s=amp(s);sraw=amp(sraw);
	}
	var din=this.stack.length-1;
	this.stack[din].inner=this.stack[din].inner||"";
	this.stack[din].inner+=s;
	this.stack[din].inner_raw=this.stack[din].inner_raw||"";
	this.stack[din].inner_raw+=sraw;
}
// When a tag is closed.
P.prototype.comptag=function(){
	var s=this.stack[din].inner;
	var sraw=this.stack[din].inner_raw;
	var tg=this.stack[din].name;
	// Call the rendering function
	if(tags[tg].comp){
		if(typeof(tags.comp)=="function")
			s=tags[tg].comp(this.stack[din]);
		else{
			// Series of functions
			if(!tags[tg].forEach)throw "Function list not iterable.";
			tags[tg].forEach(function(x){
				if(typeof(x)!="function")
					throw "Function list item invalid.s";
				this.stack[din].inner_res=x(P.stack[din]);
			});
			s=this.stack[din].inner_res;
		}
	}else throw "Node rendering function not implemented.";
	this.stack.pop();
	this.add_string(s,sraw);
}
// Parse a tag
// Not a member function
function parse_tag(s){
	var len=s.length;
	var curs="";
	var read_str=false;
	var read_esc=false;
	var stab=[];
	for(let i=0;i<len;i++){
		if(read_str){
			// Inside a string
			if(s[i]=="\""&&!read_esc){
				// Close quote
				read_str=read_esc=false;
				curs="\""+curs+"\"";
				stab.push(curs);
				curs="";
				continue;
			}
			// Toggle escape
			if(s[i]=="\\"||read_esc){
				read_esc=!read_esc;
			}
			curs+=s[i];
		}else{
			// Open quote
			if(s[i]=="\""){read_str=1;continue;}
			// Separator
			if(s[i]==" "||s[i]=="\t"||s[i]=="\n"||s[i]=="="){
				if(curs!="")stab.push(curs);
				curs="";
				if(s[i]=="=")stab.push("=");
			}else curs+=s[i];
		}
	}
	let prev="";
	let equal=false;
	let args={};
	let name="";
	stab.forEach(function(x,i){
		if(x!="="){
			if(x!=""&&x[0]=="\"")x=JSON.parse(x); // Quoted string
			if(name==""&&i==0)name=x; //Tag name
			if(equal&&prev!="")args[prev]=x; //Property
			else if(x!="")args[x]="";
			prev=x;
		}
		equal=x=="=";
	});
	let is_close_tag=false;
	if(name!=""){
		if(name[0]=="/"){ //Closing tag
			name=name.substring(1);
			is_close_tag=true;
		}
	}
	return{name:name,arg:args,is_close_tag:is_close_tag};
}
// Calls when a tag is invalid.
// Sends the invalid tag back to add_char again.
// See the comments before add_char.
P.prototype.on_invalid_tag=function(){
	var x=this.curtag;
	this.curtag="";
	this.readtag=false;
	this.add_string(x[0]);
	this.add_multi(x.substr(1));
}
// Proceed when a new char is read
// Note that add_char may call itself when needed.
// For example:
// [some_invalid_tag="[b]"]Bold text[/b]
// When add_char receives the second ], it realizes
// that this it's an invalid tag. So it adds the first [ to the stack top directly, and passes
// some_invalid_tag="[b]"]
// to add_char again.
P.prototype.add_char=function(c){
	if(this.readstr){
		// Inside a string.
		// Here we just figure out the beginning and the end.
		if(this.esc){this.esc=false;}else{
			if(c=='"'){
				this.readstr=false;
				this.curstr+=c;
				this.curtag+=this.curstr;
				this.curstr="";
				return;
			}
			else if(c=="\\")this.esc=true;
		}
		this.curstr+=c;
		return;
	}
	if(this.readtag){
		if(c=='"'){
			// Let's read a string.
			this.curstr=c;
			this.readstr=true;
			return;
		}
		if(c=="["||(c=="\n")){
			// Only when we find another [ or unexpected \n do we realize this is meant to be plain text.
			on_invalid_tag();
			P.curtag="[";
			// No return;. It is a new beginning.
		}else if(c=="]"){
			P.curtag+=c;
			let pt=parse_tag(P.curtag);
			let din=P.stack.length-1;
			if(pt.is_close_tag){
				if(din<0){
					//No open tag at all
					on_invalid_tag();
					return;
				}
				if(pt.name==P.stack[din].name){
					// They match
					comptag();
					return;
				}else{
					// They don't match
					on_invalid_tag();
					return;
				}
			}else{
				// Invalid tag, or any tag inside tags like [code][/code]
				let israw=tags[P.stack[din]].raw;
				if((!tags[pt.name])||israw){
					on_invalid_tag();
					return;
				}else{
					// Yeah!
					pt.inner=pt.inner_raw="";
					P.stack.push(pt);
					if(tags[pt.name].unpaired)comptag();
				}
			}
		}
	}
	if(!P.readtag){
		if(c=="["){
			P.readtag=true;
			P.curtag="[";
			return;
		}else{
			if(tags[this.stack[this.stack.length-1].singleline
				&&c=="\n")comptag();
			else add_string(c);
		}
	}
}
P.prototype.add_multi=function(s){
	this.input_arg=arguments;
	for(let i=0;i<s.length;i++)add_char(s[i]);
}
