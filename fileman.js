var fs=require("fs");
var path=require("path");
var source_path=path.join(path.resolve("."),"source");
var submod_path=path.join(path.resolve("."),"submod");
// rm dir/*
function remove_innerfiles(dir){
    let x=fs.readdirSync(dir,{withFileTypes=true});
    x.forEach((y,i)=>{
        if(y.isDirectory()){
            let z=path.join(dir,y.name)
            remove_innerfiles(z);
            fs.rmdirSync(z);
        }else fs.unlink(path.join(dir,y.name));
    })
}
