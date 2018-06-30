/********************************************************
generate.script - version 4.0
This file is a part of SmoothVideo Project (SVP) package.

Description: script for building Avisynth processing script.
********************************************************/

// SVPflow arguments
var levels,analyse,smooth;

override = function() {}

//parameters for SVSuper
function defineSuper()
{
    var levels={};

    pel=profile.fi_precision;
    if (pel>0 && pel!=2) levels.pel=pel;
    if (pel==0) levels.pel=1;

    levels.scale={};
    levels.scale.up=(global.gpu ? 0:2);
    if(media.x64) levels.scale.up=0;

    levels.padding={};
    levels.gpu=(global.gpu? 1:0);
    if (pel<2) levels.full=false;

    return levels;
}

//parameters for SVAnalyse
function defineAnalyse()
{
    var analyse={};
    if(profile.fi_shader===1)
        analyse.vectors=2;

    analyse.block={};

    switch(profile.mv_grid)
    {
    case 32: analyse.block.w=32; analyse.block.overlap=0; break;
    case 28: analyse.block.w=32; analyse.block.overlap=1; break;
    case 24: analyse.block.w=32; break;
    case 16: analyse.block.overlap=0; break;
    case 14: analyse.block.overlap=1; break;
    case 12: break;
    case 8: analyse.block.w=8; analyse.block.overlap=0; break;
    case 7: analyse.block.w=8; analyse.block.overlap = profile.mv_refine ? 0:1; break;
    case 6: analyse.block.w=8; break;
    }

    var div = profile.mv_refine ? 2:1;
    if(!global.gpu && (Math.floor(profile.mv_grid/div))%2==1)
    {
        analyse.block.overlap=0;
    }

    analyse.main={};
    analyse.main.search={};
    analyse.main.search.coarse={};

    switch(profile.mv_radius)
    {
    case 0: analyse.main.search.coarse.satd=false;
        //no break here!
    case 1: analyse.main.search.coarse.type=2;
        analyse.main.search.coarse.distance=-6;
        break;
    case 2: analyse.main.search.coarse.distance=-8; break;
    case 3: analyse.main.search.coarse.distance=-12; break;
    }
    if(profile.fi_precision===0)
        analyse.main.search.distance=0;
    else analyse.main.search.type=2;

    analyse.main.search.coarse.bad={};
    switch(profile.mv_wide)
    {
    case 0: analyse.main.search.coarse.bad.range=0;break;
    case 1: break;
    case 2: analyse.main.search.coarse.bad.sad=2000;
        analyse.main.search.coarse.bad.range=24;
        break;
    case 3: analyse.main.search.coarse.bad.sad=2000; break;
    }

    analyse.main.penalty={}

    analyse.refine=[];

    if(profile.mv_refine)
    {
        analyse.refine[0]={};
        analyse.refine[0].thsad=profile.mv_refine;
        analyse.refine[0].search={};
        analyse.refine[0].penalty={};

        //TODO: "to small / smallest step"
    }

    return analyse;
}

//parameters for black border lighting
function defineLights()
{
    var lights={};

    if(!global.allow_lights || global.light_type<=0 || global.light_type>2 || global.demo)
        return lights;

    var sw = global.screen_w / (media.par>1.01 ? media.par : 1.0);
    var sh = global.screen_h * (media.par<0.99 ? media.par : 1.0);

    lights.aspect = sw/sh;
    lights.lights = global.l_count;
    lights.border = global.l_depth;
    lights.length = global.l_intencity;
    lights.cell =   global.l_width;

    if(global.light_type===2)
    {
        lights.zoom = global.glow_amount;

        new_w = media.dst_w_par * (1+lights.zoom/100);
        new_h = media.dst_h_par + (new_w-media.dst_w_par);
        if(media.par>1.01) new_w /= media.par;
        else if(media.par<0.99) new_h *= media.par;
        lights.aspect = Math.round(new_w*1000/new_h)/1000;
    }

    var ar = media.dst_w_par/media.dst_h_par;
    if(lights.aspect>ar+0.01 && lights.aspect/ar>global.max_ratio) lights.aspect = ar*global.max_ratio;
    if(lights.aspect<ar-0.01 && ar/lights.aspect>global.max_ratio) lights.aspect = ar/global.max_ratio;

    if(Math.abs(lights.aspect - ar) < 0.01)
        return {};

    lights.aspect = Math.round(lights.aspect*1000)/1000;

    return lights;
}

//parameters for SVSmoothFps
function defineSmooth()
{
    var smooth={};

    if (global.gpu>0)
    {
        smooth.gpuid = global.gpu===1 ? 11 : global.gpu;

        if(global.gpu_scores>0)
        {
            k = media.dst_w*media.dst_h*media.dst_fps/1920/1080/60;
            //if(global.gpu_scores<250*k) smooth.cubic=0;
            if(global.gpu_scores<350*k) smooth.linear=false;
        }
    }

    smooth.rate={}
    smooth.rate.num=media.fi_num;
    smooth.rate.den=media.fi_den;
    //TODO
    //if(stereoMode!=0 && media.dst_fps<73)
    //	smooth.rate.num *= 2;

    if(profile.fi_shader===10)
    {
        if(!global.gpu) smooth.block=true;
        profile.fi_shader=11;
    }
    smooth.algo=profile.fi_shader;

    smooth.mask={};
    if(profile.fi_masking!==0)
        smooth.mask.area=profile.fi_masking;
    if(smooth.algo>=21)
        smooth.mask.cover=80;

    smooth.scene={};
    if(profile.fi_scene_changes===0)
        smooth.scene.blend=true;

    smooth.scene.limits={};
    switch(profile.fi_mode)
    {
    case 1: smooth.scene.mode=2; break;
    case 2: /*smooth.scene.mode=3;*/
        smooth.scene.limits.m1=0;
        smooth.scene.limits.m2=0;
        break;
    case 3: smooth.scene.mode=1; break;
    case 4: /*smooth.scene.mode=3;*/ break;
    case 5: smooth.scene.mode=0; break;
    }

    if(smooth.scene.mode==2 && media.fi_num/media.fi_den < 1.999)
        smooth.scene.mode=1;

    smooth.debug={};

    return smooth;
}

function run()
{
    if(!profile.on || (media.fi_num===1 && media.fi_den===1) || global.crop_preview)
    {
        levels={};
        analyse={};
        smooth={rate:{num:1}};
        if(!global.crop_preview)
            smooth.light=defineLights();

        if(global.threads>4) global.threads=4;
    }
    else
    {
        levels=defineSuper();
        analyse=defineAnalyse();
        smooth=defineSmooth();
        smooth.light=defineLights();

        for(opt in global)
            if(opt.indexOf("levels_")===0 || opt.indexOf("analyse_")===0 || opt.indexOf("smooth_")===0)
                eval(opt.replace(/_/g,".")+"="+global[opt]+";");
        for(opt in profile)
            if(opt.indexOf("levels_")===0 || opt.indexOf("analyse_")===0 || opt.indexOf("smooth_")===0)
                eval(opt.replace(/_/g,".")+"="+profile[opt]+";");

        override();
    }

    levels.rc=true; //!global.encode;

    switch(global.frame_server)
    {
        case 0: return gen_avs(false);  //Avisynth
        case 1: return gen_avs(true);   //Avisynth+
        case 2: return gen_vs();        //Vapoursynth
    }
}

//generate AVS/AVS+ script file
function gen_avs(is_avsplus)
{
    AVS = [];

    AVS.push('# This script was generated by SVP 4 Manager.');
    AVS.push('# Check https://www.svp-team.com for more details.');
    AVS.push("");

    AVS.push('SetMemoryMax('+global.max_memory+')');
    AVS.push("");

    AVS.push('global threads='+global.threads);
    AVS.push("");

    pluginsDir = global.is_x64 ? "plugins64":"plugins";
    AVS.push('LoadPlugin("'+global.apppath+pluginsDir+'\\svpflow1.dll")');
    AVS.push('LoadPlugin("'+global.apppath+pluginsDir+'\\svpflow2.dll")');
    AVS.push("");

    if(!is_avsplus)
        AVS.push('SetMTMode(3,threads)');
    if(is_avsplus)
    {
        AVS.push('SetFilterMTMode("DEFAULT_MT_MODE",2)');
        AVS.push('SetFilterMTMode("SVSuper",1)');
        AVS.push('SetFilterMTMode("SVAnalyse",1)');
//        AVS.push('SetFilterMTMode("SVSmoothFps",1)');
        if(global.player==0)
            AVS.push('SetFilterMTMode("ffdshow_source",3)');
        else
            AVS.push('SetFilterMTMode("potplayer_source",3)');
    }

    if(global.player==0)
        AVS.push("ffdshow_source()")
    else
        AVS.push("potplayer_source()")

    if(!is_avsplus)
        AVS.push('SetMTMode(2)');
    AVS.push("");

    AVS.push("ConvertToYV12()");
    AVS.push("");

    if(global.dropEven)
    {
        smooth.rate.num*=2;
        AVS.push("SelectEvery(2,0)");
        AVS.push("");
    }

    crop="";
    if(media.crop && !global.crop_preview)
        crop="crop("+media.crop[0]+","+media.crop[1]+",-"+media.crop[2]+",-"+media.crop[3]+")";
    AVS.push('global crop_string  = "'+crop+'"');

    scale="";
    if(media.scale && !global.crop_preview)
    {
        if(!media.scale_down)
            scale="LanczosResize("+media.scale[0]+","+media.scale[1]+")";
        else
            scale="BicubicResize("+media.scale[0]+","+media.scale[1]+",b=0,c=0.75)";
    }
    AVS.push('global resize_string = "'+scale+'"');

    AVS.push('global super_params     = "'+toJSON(levels)+'"');
    AVS.push('global analyse_params   = "'+toJSON(analyse)+'"');
    AVS.push('global smoothfps_params = "'+toJSON(smooth)+'"');
    AVS.push("");
    AVS.push("global demo_mode="+(global.demo && profile.on ? 1:0));
    AVS.push("global stereo_type="+(media.stereo===3 ? 0:media.stereo));
    //AVS.push('stereo_left_selection="'+stereoLeftSelection+'"');
    //AVS.push('stereo_right_selection="'+stereoRightSelection+'"');

    if(global.demo)
    {
        AVS.push("");
        AVS.push('function demo(clip src,clip smooth)');
        AVS.push('{');
        AVS.push('\tsrcd = src.crop(0,0,-Int(src.width/4)*2-2,0)');
        AVS.push('\tsrcd = srcd.ChangeFPS(FramerateNumerator(src)*'+media.fi_num+', FramerateDenominator(src)*'+media.fi_den+')');
        AVS.push('\tres  = smooth.crop(Int(src.width/4)*2,0,0,0)');
        AVS.push('\treturn StackHorizontal(srcd.Subtitle("Source", align=2),srcd.BlankClip(width=2),res.Subtitle("Smooth", align=2))');
        AVS.push('}');
        AVS.push("");
    }

    var base = global.baseScript;
//    if(!is_avsplus)
//    {
//        base = base.replace("#MT-MODE-1","SetMTMode(1)");
//        base = base.replace("#MT-MODE-2","SetMTMode(2)");
//    }

    AVS.push("");
    AVS.push(base);
    AVS.push("");

    if(!is_avsplus)
        AVS.push("distributor()");
    if(is_avsplus)
        AVS.push("Prefetch(threads)");

    return AVS.join("\r\n");
}

//generate Vapoursynth script file

function gen_vs_prepare_clip()
{
    res = '';
    bl = '    '; br = '\r\n';

    if(global.player===2 && media.codec==="rv32") //VLC + RGB input
        res += bl+'input_um = clip.resize.Bicubic(format=vs.YUV420P8, matrix_s="709")'+br;
    else
        res += bl+'input_um = clip.resize.'+(media.is420 ? 'Point':'Bicubic')+'(format=vs.YUV420'+(media.p10?'P10':'P8')+')'+br;
    res += bl+'input_m = input_um'+br;

    if(media.crop && !global.crop_preview)
        res += bl+"input_m = input_m.std.CropRel("+media.crop[0]+","+media.crop[2]+","+media.crop[1]+","+media.crop[3]+")"+br;

    if(media.scale && !global.crop_preview)
    {
        if(!media.scale_down)
            res += bl+"input_m = input_m.resize.Lanczos("+media.scale[0]+","+media.scale[1]+")"+br;
        else
            res += bl+"input_m = input_m.resize.Bicubic("+media.scale[0]+","+media.scale[1]+",filter_param_a=0,filter_param_b=0.75)"+br;
    }
    res += bl+'input_m8 = '+(media.p10 ? 'input_m.resize.Point(format=vs.YUV420P8)':'input_m')+br;

    return res;
}

function gen_vs()
{
    VS = [];

    VS.push('# This script was generated by SVP 4 Manager.');
    VS.push('# Check https://www.svp-team.com for more details.');
    VS.push("");

    VS.push('import vapoursynth as vs');
    VS.push('core = vs.get_core(threads='+global.threads+')');
    VS.push("");

    pluginsDir="plugins";
    sep = "/"; pfx = "lib";
    apppath = global.apppath;
    if(global.os==="win")
    {
        sfx = "_vs";
        pfx = "";
        sep = "\\\\";
        apppath = apppath.replace(/\\/g,"\\\\");
        if(global.is_x64) pluginsDir+="64";
    }
    else sfx = global.is_x64 ? "_vs64":"_vs";
    if(global.os==="win") sfx+=".dll";
    else if(global.os==="lin") sfx+=".so";
    else if(global.os==="mac") sfx+=".dylib";

    VS.push('core.std.LoadPlugin("'+apppath+pluginsDir+sep+pfx+'svpflow1'+sfx+'")');
    VS.push('core.std.LoadPlugin("'+apppath+pluginsDir+sep+pfx+'svpflow2'+sfx+'")');
    VS.push("");
    VS.push('clip = video_in');

    VS.push('super_params     = "'+toJSON(levels)+'"');
    VS.push('analyse_params   = "'+toJSON(analyse)+'"');
    VS.push('smoothfps_params = "'+toJSON(smooth)+'"');

    VS.push("");
    VS.push("src_fps     = container_fps if container_fps>0.1 else "+(Math.round(media.src_fps*1000)/1000));
    VS.push("demo_mode   = "+(global.demo && profile.on ? 1:0));
    VS.push("stereo_type = "+(media.stereo===3 ? 0:media.stereo));

    if(global.demo)
    {
        VS.push("");
        VS.push('# ChangeFPS replacement - http://forum.doom9.org/showthread.php?p=1700573#post1700573')
        VS.push('import functools');
        VS.push('import math');
        VS.push('def demo(src,smooth):');
        VS.push('    half_src = core.std.CropRel(src,0,(int)(src.width/4)*2-2,0,0)');
        VS.push("");
        VS.push('    def frame_adjuster(n, clip, target_fps_num, target_fps_den):');
        VS.push('        real_n = math.floor(n / (target_fps_num / target_fps_den / src_fps))');
        VS.push('        one_frame_clip = clip[real_n] * (len(clip) + 100)');
        VS.push('        return one_frame_clip');
        VS.push("");
        VS.push('    attribute_clip = core.std.BlankClip(half_src, length=math.floor(len(half_src) * smooth.fps_num / smooth.fps_den / src_fps), fpsnum=smooth.fps_num, fpsden=smooth.fps_den)');
        VS.push('    half_src = core.std.FrameEval(attribute_clip, functools.partial(frame_adjuster, clip=half_src, target_fps_num=smooth.fps_num, target_fps_den=smooth.fps_den))');
        VS.push("");
        VS.push('    half_smooth  = core.std.CropRel(smooth,(int)(src.width/4)*2,0,0,0)');
        VS.push('    demo_clip = core.std.StackHorizontal([half_src,core.std.BlankClip(half_src,width=2),half_smooth])');
//        VS.push('    demo_clip = core.std.StackHorizontal([core.assvapour.Subtitle(half_src,"Source")[0],core.std.BlankClip(half_src,width=2),core.assvapour.Subtitle(half_smooth,"Smooth")[0]])');
        VS.push('    return core.std.AssumeFPS(demo_clip,smooth)')
        VS.push("");
    }

    VS.push("");
    VS.push(global.baseScript.replace("#RESIZE-CODE",gen_vs_prepare_clip()));
    VS.push("");

    if(global.player===2) //VLC
    {
        if(media.codec==="rv32") //RGB input
            VS.push('smooth = smooth.resize.Bicubic(format=vs.COMPATBGR32).std.FlipVertical()');
        else if(!media.is420 && media.src_fmt.length)
            VS.push('smooth = smooth.resize.Bicubic(format=vs.'+media.src_fmt+')');
    }

    VS.push('smooth.set_output()')

    return VS.join("\r\n");
}
