// SSimSuperRes by Shiandow
//
// This library is free software; you can redistribute it and/or
// modify it under the terms of the GNU Lesser General Public
// License as published by the Free Software Foundation; either
// version 3.0 of the License, or (at your option) any later version.
// 
// This library is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
// Lesser General Public License for more details.
// 
// You should have received a copy of the GNU Lesser General Public
// License along with this library.

//!HOOK POSTKERNEL
//!BIND HOOKED
//!SAVE LOWRES
//!WIDTH NATIVE_CROPPED.w
//!WHEN NATIVE_CROPPED.w POSTKERNEL.w <
//!COMPONENTS 4
//!DESC SSSR Downscaling I

#define factor      ((POSTKERNEL_pt*input_size)[axis])

#define axis 0

#define offset      vec2(0,0)

#define Kernel(x)   cos(acos(-1.0)*x/taps)
#define taps        2.0

#define Kb 0.0722
#define Kr 0.2126
#define Luma(rgb)   ( dot(vec3(Kr, 1.0 - Kr - Kb, Kb), pow(abs(rgb), vec3(2.0))) )

vec4 hook() {
    // Calculate bounds
    float low  = floor((POSTKERNEL_pos - 0.5*taps/input_size) * POSTKERNEL_size - offset + 0.5)[axis];
    float high = floor((POSTKERNEL_pos + 0.5*taps/input_size) * POSTKERNEL_size - offset + 0.5)[axis];

    float W = 0.0;
    vec4 avg = vec4(0);
    vec2 pos = POSTKERNEL_pos;

    for (float k = 0.0; k < high - low; k++) {
        pos[axis] = POSTKERNEL_pt[axis] * (k + low + 0.5);
        float rel = (pos[axis] - POSTKERNEL_pos[axis])*input_size[axis] + offset[axis]*factor;
        float w = Kernel(rel);

        vec4 o = textureLod(POSTKERNEL_raw, pos, 0.0) * POSTKERNEL_mul;
        o.a = Luma(o.rgb);
        avg += w * o;
        W += w;
    }
    avg /= W;

    return avg;
}

//!HOOK POSTKERNEL
//!BIND HOOKED
//!BIND LOWRES
//!SAVE LOWRES
//!WIDTH NATIVE_CROPPED.w
//!HEIGHT NATIVE_CROPPED.h
//!WHEN NATIVE_CROPPED.w POSTKERNEL.w <
//!COMPONENTS 4
//!DESC SSSR Downscaling II

#define factor      ((LOWRES_pt*input_size)[axis])

#define axis 1

#define offset      vec2(0,0)

#define Kernel(x)   cos(acos(-1.0)*x/taps)
#define taps        2.0

#define Kb 0.0722
#define Kr 0.2126
#define Luma(rgb)   ( dot(vec3(Kr, 1.0 - Kr - Kb, Kb), pow(abs(rgb), vec3(2.0))) )

vec4 hook() {
    // Calculate bounds
    float low  = floor((LOWRES_pos - 0.5*taps/input_size) * LOWRES_size - offset + 0.5)[axis];
    float high = floor((LOWRES_pos + 0.5*taps/input_size) * LOWRES_size - offset + 0.5)[axis];

    float W = 0.0;
    vec4 avg = vec4(0);
    vec2 pos = LOWRES_pos;

    for (float k = 0.0; k < high - low; k++) {
        pos[axis] = LOWRES_pt[axis] * (k + low + 0.5);
        float rel = (pos[axis] - LOWRES_pos[axis])*input_size[axis] + offset[axis]*factor;
        float w = Kernel(rel);

        avg += w * textureLod(LOWRES_raw, pos, 0.0) * LOWRES_mul;
        W += w;
    }
    avg /= W;

    return vec4(avg.rgb, clamp(avg.a - Luma(avg.rgb), 0.0, 1.0));
}

//!HOOK POSTKERNEL
//!BIND HOOKED
//!BIND PREKERNEL
//!BIND LOWRES
//!SAVE mL
//!WIDTH LOWRES.w
//!HEIGHT LOWRES.h
//!WHEN NATIVE_CROPPED.w POSTKERNEL.w <
//!COMPONENTS 4
//!DESC SSSR meanL & var

#define locality    32.0
#define spread      1.0 / locality

#define sqr(x)      pow(x, 2.0)
#define GetL(x,y)   PREKERNEL_tex(PREKERNEL_pt*(PREKERNEL_pos * LOWRES_size + tex_offset + vec2(x,y))).rgb

#define Gamma(x)    ( pow(clamp(x, 0.0, 1.0), vec3(1.0/2.0)) )
#define Kb 0.0722
#define Kr 0.2126
#define Luma(rgb)   ( dot(vec3(Kr, 1.0 - Kr - Kb, Kb), pow(abs(rgb), vec3(2.0))) )

vec4 hook() {
    vec3 meanL = vec3(0);
    for (int X=-1; X<=1; X++)
    for (int Y=-1; Y<=1; Y++) {
        meanL += GetL(X,Y) * pow(spread, sqr(float(X)) + sqr(float(Y)));
    }
    meanL /= (1.0 + 4.0*spread + 4.0*spread*spread);

    float varL = 0.0;
    for (int X=-1; X<=1; X++)
    for (int Y=-1; Y<=1; Y++) {
        varL += Luma(GetL(X,Y) - meanL) * pow(spread, sqr(float(X)) + sqr(float(Y)));
    }
    varL /= (spread + 4.0*spread + 4.0*spread*spread);

    return vec4((meanL), varL);
}

//!HOOK POSTKERNEL
//!BIND HOOKED
//!BIND LOWRES
//!SAVE mH
//!WIDTH LOWRES.w
//!HEIGHT LOWRES.h
//!WHEN NATIVE_CROPPED.w POSTKERNEL.w <
//!COMPONENTS 4
//!DESC SSSR meanH & var

#define locality    32.0
#define spread      1.0 / locality

#define sqr(x)      pow(x, 2.0)
#define GetH(x,y)   LOWRES_texOff(vec2(x,y)).rgb

#define Gamma(x)    ( pow(clamp(x, 0.0, 1.0), vec3(1.0/2.0)) )
#define Kb 0.0722
#define Kr 0.2126
#define Luma(rgb)   ( dot(vec3(Kr, 1.0 - Kr - Kb, Kb), pow(abs(rgb), vec3(2.0))) )

vec4 hook() {
    vec3 meanH = vec3(0);
    for (int X=-1; X<=1; X++)
    for (int Y=-1; Y<=1; Y++) {
        meanH += GetH(X,Y) * pow(spread, sqr(float(X)) + sqr(float(Y)));
    }
    meanH /= (1.0 + 4.0*spread + 4.0*spread*spread);

    float varH = 0.0;
    for (int X=-1; X<=1; X++)
    for (int Y=-1; Y<=1; Y++) {
        varH += Luma(GetH(X,Y) - meanH) * pow(spread, sqr(float(X)) + sqr(float(Y)));
    }
    varH /= (spread + 4.0*spread + 4.0*spread*spread);

    return vec4((meanH.rgb), varH);
}

//!HOOK POSTKERNEL
//!BIND HOOKED
//!BIND LOWRES
//!BIND mL
//!BIND mH
//!WHEN NATIVE_CROPPED.w POSTKERNEL.w <
//!DESC SSSR final pass

// -- Window Size --
#define taps        3.0
#define even        (taps - 2.0 * floor(taps / 2.0) == 0.0)
#define minX        int(1.0-ceil(taps/2.0))
#define maxX        int(floor(taps/2.0))

#define factor      (LOWRES_pt*HOOKED_size)
#define Kernel(x)   (cos(acos(-1.0)*(x)/taps)) // Hann kernel

#define sqr(x)      dot(x,x)

// -- Input processing --
#define meanL(x,y)  ( mL_tex(mL_pt*(pos+vec2(x,y)+0.5)) )
#define meanH(x,y)  ( mH_tex(mH_pt*(pos+vec2(x,y)+0.5)) )
#define Lowres(x,y) ( LOWRES_tex(LOWRES_pt*(pos+vec2(x,y)+0.5)) )

#define Gamma(x)    ( pow(clamp(x, 0.0, 1.0), vec3(1.0/2.0)) )
#define GammaInv(x) ( pow(clamp(x, 0.0, 1.0), vec3(2.0)) )
#define Kb 0.0722
#define Kr 0.2126
#define Luma(rgb)   ( dot(vec3(Kr, 1.0 - Kr - Kb, Kb), pow(abs(rgb), vec3(2.0))) )

vec4 hook() {
    vec4 c0 = HOOKED_tex(HOOKED_pos);

    // Calculate position
    vec2 pos = HOOKED_pos * LOWRES_size - vec2(0.5);
    vec2 offset = pos - (even ? floor(pos) : round(pos));
    pos -= offset;

    float mVar = 0.0;
    for (int X=-1; X<=1; X++)
    for (int Y=-1; Y<=1; Y++)
        mVar += LOWRES_texOff(vec2(X,Y)).a * pow(0.25, sqr(float(X)) + sqr(float(Y)));
    mVar /= 2.25;

    // Calculate faithfulness force
    float weightSum = 0.0;
    vec3 diff = vec3(0);

    for (int X = minX; X <= maxX; X++)
    for (int Y = minX; Y <= maxX; Y++)
    {
        vec4 l = meanL(X,Y);
        vec4 h = meanH(X,Y);
        float R = -sqrt((l.a + sqr(0.5/255.0)) / (h.a + mVar + sqr(0.5/255.0)));
        float Var = Lowres(X,Y).a;

        vec2 krnl = Kernel(vec2(X,Y) - offset);
        float weight = krnl.r * krnl.g / (Luma(c0.rgb - Lowres(X,Y).rgb) + Var + sqr(0.5/255.0));

        diff += weight * (l.rgb + h.rgb * R + (-1.0 - R) * (c0.rgb));
        weightSum += weight;
    }
    diff /= weightSum;

    c0.rgb = ((c0.rgb) + diff);

    return c0;
}
