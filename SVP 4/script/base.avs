########## BEGIN OF base.avs ##########
# This file is a part of SmoothVideo Project (SVP) ver.4
# This is NOT the full AVS script, all used variables are defined via
# JScript code that generates the full script text.

function interpolate(clip src)
{
	input = crop_string=="" ? src : eval("src."+crop_string)
	input = resize_string=="" ? input : eval("input."+resize_string)

	#MT-MODE-1  #do not remove this line!

	super=SVSuper(input, super_params)
	vectors=SVAnalyse(super, analyse_params, src=input)
	smooth=SVSmoothFps(input, super, vectors, smoothfps_params, mt=threads, src=src)

	#MT-MODE-2  #do not remove this line!

	return demo_mode==0 ? smooth : demo(input,smooth)
}

input=last

	stereo_type==0 ? eval(""" interpolate(input)
""") : 	stereo_type==1 ? eval("""
		lf = interpolate(input.crop(0,0,input.width/2,0))
		rf = interpolate(input.crop(input.width/2,0,0,0))
		StackHorizontal(lf, rf)
""") : 	stereo_type==2 ? Eval("""
		lf = interpolate(input.crop(0,0,0,input.height/2))
		rf = interpolate(input.crop(0,input.height/2,0,0))
		StackVertical(lf, rf)""") : input

########### END OF base.avs ###########
