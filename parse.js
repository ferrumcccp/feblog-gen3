/* Tag Format
{
name: Tag Name,
arg: Arguments,
is_close_tag: Whether it is a close tag,
is_close_tag: Whether it is a tag that closes the previous node
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
singleline: If true, the tag should end automatically when the line breaks.
comp: function(tag) for proceeding the tag
}
P.result: Result
P.outfunc: Output function used when provided
P.stack: stack
tags: Table of tag definition
*/

// tmp vars used in parser
var tags={}
var P={}

var fs=require("fs")
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
function add_string(s,sraw){
	sraw=sraw||s;
	if(P.stack.length==0){
		if(P.outfunc)P.outfunc(amp(s));
		else P.result+=amp(s);
		return;
	}
	if(!tags[s].raw_html){
		s=amp(s);sraw=amp(sraw);
	}
	var din=P.stack.length-1;
	P.stack[din]=P.stack[stack.length]||{};
	P.stack[din].inner=P.stack[din].inner||"";
	P.stack[din].inner+=s;
	P.stack[din].inner_raw=P.stack[din].inner_raw||"";
	P.stack[din].inner_raw+=sraw;
}
// When a tag is closed.
function comptag(){
	var s=P.stack[din].inner;
	var sraw=P.stack[din].inner_raw;
	var tg=P.stack[din].name;
	if(tags[tg].comp){
		if(typeof(tags.comp)=="function")
			s=tags[tg].comp(P.stack[din]);
		else{
			let len=tags[tg].length;
			for(let i=0;i<len;i++){
				P.stack[din].inner_res
					=tags[tg].comp(P.stack[din]);
			}
			s=P.stack[din].inner_res;
		}
	}else throw "Unimplemented";
	stack.pop();
	add_string(s,sraw);
}
// Parse a tag
// TODO: implement this
function parse_tag(s){
	var len=s.length;
	var curs="";
	var read_str=false;
	var read_esc=false;
	var stab=[];
	for(let i=0;i<len;i++){
		if(read_str){
			if(s[i]=="\\"){
				read_esc=!read_esc;
			}
			else if(s[i]=="\""&&!read_esc){
				read_str=read_esc=false;
				curs="\""+curs+"\"";
				stab.push(curs);
				curs="";
				continue;
			}
			curs+=s[i];
		}else{
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
	stab.forEach(function(x){
		if(x!="="){
			if(x!=""&&x[0]=="\"")x=JSON.parse(x);
			if(name=="")name=x;
			if(equal&&prev!="")args[prev]=x;
			else if(x!="")args[x]="";
			prev=x;
		}
		equal=x=="=";
	});
	let is_close_tag=false;
	if(name!=""){
		if(name[0]=="/"){
			name=name.substring(1);
			is_close_tag=true;
		}
	}
	return{name:name,arg:args,is_close_tag:is_close_tag};
}
// Calls when a tag is invalid.
// Sends the invalid tag back to add_char again.
// See the comments before add_char.
function on_invalid_tag(){
	var x=P.curtag;
	P.curtag="";
	P.readtag=false;
	add_string(x[0]);
	add_multi(x.substr(1));
}
// Proceed when a new char is read
// Note that add_char may call itself when needed.
// For example:
// [some_invalid_tag="[b]"]Bold text[/b]
// When add_char receives the second ], it realizes
// that this it's an invalid tag. So it adds the first [ to the stack top directly, and passes
// some_invalid_tag="[b]"]
// to add_char again.
function add_char(c){
	if(P.readstr){
		// Inside a string.
		// Here we just figure out the beginning and the end.
		if(P.esc){P.esc=false;}else{
			if(c=='"'){
				P.readstr=false;
				P.curstr+=c;
				P.curtag+=P.curstr;
				P.curstr="";
				return;
			}
			else if(c=="\\")P.esc=true;
		}
		P.curstr+=c;
		return;
	}
	if(P.readtag){
		if(c=='"'){
			// Let's read a string.
			P.curstr=c;
			P.readstr=true;
			return;
		}
		if(c=="["||
			(c=="\n"&&P.stack.length&&
			tags[P.stack[P.stack.length-1]].singleline)){
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
					let ct=comptag(P.stack[din]);
					let raw=P.stack[din].inner_raw;
					P.stack.pop();
					addstring(ct,raw);
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
				}
			}
		}
	}
	if(!P.readtag){
		if(c=="["){
			P.readtag=true;
			P.curtag="[";
			return;
		}else add_string(c);
	}
}
function add_multi(s){
	for(let i=0;i<s.length;i++)add_char(s[i]);
}
function init(){
	P={};
	if(!P.curtag)P.curtag="";
	if(!P.curstr)P.curstr="";
	P.stack=[];
	P.result="";
}
