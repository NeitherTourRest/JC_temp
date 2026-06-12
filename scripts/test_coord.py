import math
PI=3.141592653589793
A=6378245.0
EE=0.00669342162296594323

def transform_lat(x,y):
    ret=-100+2*x+3*y+0.2*y*y+0.1*x*y+0.2*math.sqrt(abs(x))
    ret+=(20*math.sin(6*x*PI)+20*math.sin(2*x*PI))*2/3
    ret+=(20*math.sin(y*PI)+40*math.sin(y/3*PI))*2/3
    ret+=(160*math.sin(y/12*PI)+320*math.sin(y*PI/30))*2/3
    return ret

def transform_lng(x,y):
    ret=300+x+2*y+0.1*x*x+0.1*x*y+0.1*math.sqrt(abs(x))
    ret+=(20*math.sin(6*x*PI)+20*math.sin(2*x*PI))*2/3
    ret+=(20*math.sin(x*PI)+40*math.sin(x/3*PI))*2/3
    ret+=(150*math.sin(x/12*PI)+300*math.sin(x/30*PI))*2/3
    return ret

def gcj02_to_wgs84(lat,lng):
    if lng<72 or lng>137 or lat<0.8 or lat>55: return lat,lng
    dlat=transform_lat(lng-105,lat-35)
    dlng=transform_lng(lng-105,lat-35)
    radlat=lat/180*PI
    magic=math.sin(radlat)
    magic=1-EE*magic*magic
    sqrtmagic=math.sqrt(magic)
    dlat=(dlat*180)/((A*(1-EE))/(magic*sqrtmagic)*PI)
    dlng=(dlng*180)/(A/sqrtmagic*math.cos(radlat)*PI)
    return lat-dlat,lng-dlng

def wgs84_to_gcj02(lat,lng):
    if lng<72 or lng>137 or lat<0.8 or lat>55: return lat,lng
    dlat=transform_lat(lng-105,lat-35)
    dlng=transform_lng(lng-105,lat-35)
    radlat=lat/180*PI
    magic=math.sin(radlat)
    magic=1-EE*magic*magic
    sqrtmagic=math.sqrt(magic)
    dlat=(dlat*180)/((A*(1-EE))/(magic*sqrtmagic)*PI)
    dlng=(dlng*180)/(A/sqrtmagic*math.cos(radlat)*PI)
    return lat+dlat,lng+dlng

# Test round-trip: GCJ-02 -> WGS-84 -> GCJ-02
tests = [(40.2533,116.2186),(40.1550,116.2750),(40.2200,116.2300),(40.1150,116.4250),(40.1850,116.3600)]
for glat, glng in tests:
    wlat,wlng = gcj02_to_wgs84(glat,glng)
    blat,blng = wgs84_to_gcj02(wlat,wlng)
    dlat = (blat-glat)*111000
    dlng = (blng-glng)*111000*math.cos(glat/180*PI)
    print('GCJ(%.4f,%.4f) -> WGS(%.6f,%.6f) -> back drift: %.2fm N, %.2fm E' % (glat,glng,wlat,wlng,dlat,dlng))
