var parse=require("./parse.js");
function metadata(){this.meadata={};}
metadata.prototype.render_tag(tg){
    if(tg.name=="meta"){
        this.metadata=tg.arg;
    }else if(tg.name=="_meta"){
        return JSON.stringify(this.metadata);
    }
}

parser.register_tag("meta",{
    unpaired:true,
    renderer_class=metadata;
});
parser.register_tag("_meta",{
    unpaired:true,
    renderer_class=metadata;
});

function component(){}
component.prototype.render_tag(tg){return this.inner;}
for(let i in["_head","_body","_div"])parser.register_tag(i,{
    renderer_class=component;
});
// If x is a string, then render the string.
// If x is a function, pass the subtask to it and let it work on it.
function render_page(x){
    let r=new parse.renderer();
    let rarticle=make_subtask(r);
    if(typeof(x)=="function")x(rarticle);else{
        rarticle.add_bbcode(x);
    }
    let s=rarticle.get_result();
    r.add_html("<!DOCTYPE html><html><head>");
    r.add_bbcode("[_head][/_head]");
    r.add_html("</head><body>");
    if(typeof(x)==function){
        r.add_bbcode("[_body]");
        r.add_html(s);
        r.add_bbcode("[/_body]");
    }else{
        r.add_bbcode("[_body]");
        r.add_html("<div class=\"article\">");
        r.add_bbcode("[_div]");
        r.add_html(s);
        r.add_bbcode("[_div]");
        r.add_html("</div>");
        r.add_bbcode("[/_body]");
    }
    r.add_html("</body></html>");
    let rmeta=make_subtask(r);
    rmeta.add_bbcode("[_meta]");
    let meta=JSON.parse(rmeta.get_result());
    return{page:r.get_result(),meta:meta};
}
module.exports={render_page:render_page}
