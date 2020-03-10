// Tag Format
// {
// name: Tag Name,
// arg: Arguments,
// is_close_tag: Whether it is close tag,
// inner: text between the open tag and the close tag,
// inner_raw: unrendered text
// }

// tmp vars used in parser
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
	if(stack.length==0){
		if(P.outfunc)P.outfunc(amp(s));
		else console.log(amp(s));
		return;
	}
	if(!P.tags[s].raw_html){
		s=amp(s);sraw=amp(sraw);
	}
	var din=stack.length-1;
	stack[din]=stack[stack.length]||{};
	stack[din].inner=stack[din].inner||"";
	stack[din].inner+=s;
	stack[din].inner_raw=stack[din].inner_raw||"";
	stack[din].inner_raw+=sraw;
}
// When a tag is closed.
// TODO: implement this
function comptag(tag){

}
// Parse a tag
// TODO: implement this
function parse_tag(s){
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
		if(c=="["){
			// Only when we find another [ do we realize this is meant to be plain text.
			on_invalid_tag();
			P.curtag="[";
			// No return;. It is a new beginning.
		}else if(c=="]"){
			P.curtag+="]";
			let pt=parse_tag(P.curtag);
			let din=P.stack.lengh-1;
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
				let israw=P.tags[P.stack[din]].raw;
				if((!P.tags[pt.name])||israw){
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
}
