package com.journeycraft.jc.common.util;

/**
 * Coordinate transformation between WGS-84 (GPS/OSM) and GCJ-02 (AMap/高德).
 * 
 * China uses GCJ-02 (火星坐标系) as the standard coordinate system.
 * OSM data is in WGS-84, while AMap uses GCJ-02.
 * The offset is about 300-700m in the Changping area.
 * 
 * Reference: https://on4wp7.codeplex.com/SourceControl/changeset/view/21483#353936
 */
public class CoordinateTransform {

    private static final double PI = Math.PI;
    private static final double A = 6378245.0; // semi-major axis
    private static final double EE = 0.00669342162296594323; // eccentricity squared

    /**
     * Transform WGS-84 (OSM/GPS) to GCJ-02 (AMap/高德).
     * Use this when loading OSM data to match AMap's coordinate system.
     */
    public static double[] wgs84ToGcj02(double wgsLat, double wgsLng) {
        if (outOfChina(wgsLat, wgsLng)) return new double[]{wgsLat, wgsLng};

        double dLat = transformLat(wgsLng - 105.0, wgsLat - 35.0);
        double dLng = transformLng(wgsLng - 105.0, wgsLat - 35.0);
        double radLat = wgsLat / 180.0 * PI;
        double magic = Math.sin(radLat);
        magic = 1 - EE * magic * magic;
        double sqrtMagic = Math.sqrt(magic);
        dLat = (dLat * 180.0) / ((A * (1 - EE)) / (magic * sqrtMagic) * PI);
        dLng = (dLng * 180.0) / (A / sqrtMagic * Math.cos(radLat) * PI);

        return new double[]{wgsLat + dLat, wgsLng + dLng};
    }

    /**
     * Transform GCJ-02 (AMap) back to WGS-84 (OSM/GPS).
     * Use this when user clicks on AMap to get coordinates for the OSM graph.
     */
    public static double[] gcj02ToWgs84(double gcjLat, double gcjLng) {
        if (outOfChina(gcjLat, gcjLng)) return new double[]{gcjLat, gcjLng};

        double[] wgs = wgs84ToGcj02(gcjLat, gcjLng);
        return new double[]{2 * gcjLat - wgs[0], 2 * gcjLng - wgs[1]};
    }

    private static boolean outOfChina(double lat, double lng) {
        return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
    }

    private static double transformLat(double x, double y) {
        double ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
        ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
        ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
        ret += (160.0 * Math.sin(y / 12.0 * PI) + 320.0 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
        return ret;
    }

    private static double transformLng(double x, double y) {
        double ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
        ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
        ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
        ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;
        return ret;
    }
}
