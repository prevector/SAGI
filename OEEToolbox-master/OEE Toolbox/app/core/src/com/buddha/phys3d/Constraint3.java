package com.buddha.phys3d;

public class Constraint3 {
	public Particle3 a, b;
	public float softness = 1f;
	
	public float r;
	
	public Constraint3(Particle3 a, Particle3 b) {
		this.a = a;
		this.b = b;
		r = a.pos.dst(b.pos);
	}
	
	public Constraint3(Particle3 a, Particle3 b, float r) {
		this.a = a;
		this.b = b;
		this.r = r;
	}
	
	public void solve() {
		float d1x = b.pos.x-a.pos.x;
		float d1y = b.pos.y-a.pos.y;
		float d1z = b.pos.z-a.pos.z;
		float d2 = (float)(Math.sqrt(d1x*d1x+d1y*d1y+d1z*d1z));
		float d3 = (d2-r)/d2;
		a.pos.add(d1x*d3*.5f*softness, d1y*d3*.5f*softness, d1z*d3*.5f*softness);
		b.pos.sub(d1x*d3*.5f*softness, d1y*d3*.5f*softness, d1z*d3*.5f*softness);
	}
	
	public static void solveFluid(Particle3 a, Particle3 b, float length, float vis) {
		float d1x = b.pos.x - a.pos.x;
		float d1y = b.pos.y - a.pos.y;
		float d1z = b.pos.z - a.pos.z;
		float d2 = (float)Math.sqrt(d1x*d1x+d1y*d1y+d1z*d1z);
		float d3 = (d2-length)/d2;
		d3*=.5f;
		float aPart = b.mass/(a.mass+b.mass);
		a.oldPos.sub(d1x*d3*vis*aPart, d1y*d3*vis*aPart, d1z*d3*vis*aPart);
		b.oldPos.add(d1x*d3*vis*(1-aPart), d1y*d3*vis*(1-aPart), d1z*d3*vis*(1-aPart));
	}
}
