package com.buddha.world;

import com.badlogic.gdx.math.MathUtils;

public class Constraint {
	public Particle a, b;
	public float softness = 1f;
	
	public float r;
	
	public Constraint(Particle a, Particle b) {
		this.a = a;
		this.b = b;
		r = a.pos.dst(b.pos);
	}
	
	public Constraint(Particle a, Particle b, float r) {
		this.a = a;
		this.b = b;
		this.r = r;
	}
	
	public void solve() {
		float d1x = b.pos.x-a.pos.x;
		float d1y = b.pos.y-a.pos.y;
		float d2 = (float)(Math.sqrt(d1x*d1x+d1y*d1y));
		float d3 = (d2-r)/d2;
		a.pos.add(d1x*d3*.5f*softness, d1y*d3*.5f*softness);
		b.pos.sub(d1x*d3*.5f*softness, d1y*d3*.5f*softness);
	}
	
	public void rotate(float theta) {
		float cos = MathUtils.cos(theta);
		float sin = MathUtils.sin(theta);
		float cx = (a.pos.x+b.pos.x)*.5f;
		float cy = (a.pos.y+b.pos.y)*.5f;
		float xdif = a.pos.x-cx;
		float ydif = a.pos.y-cy;
		a.pos.x = xdif*cos-ydif*sin+cx;
		a.pos.y = xdif*sin+ydif*cos+cy;
		xdif = b.pos.x-cx;
		ydif = b.pos.y-cy;
		b.pos.x = xdif*cos-ydif*sin+cx;
		b.pos.y = xdif*sin+ydif*cos+cy;
	}
	
	public static void solveFluid(Particle a, Particle b, float length, float vis) {
		float d1x = b.pos.x - a.pos.x;
		float d1y = b.pos.y - a.pos.y;
		float d2 = (float)Math.sqrt(d1x*d1x+d1y*d1y);
		float d3 = (d2-length)/d2;
		d3*=.5f;
		float aPart = b.mass/(a.mass+b.mass);
		a.oldPos.sub(d1x*d3*vis*aPart, d1y*d3*vis*aPart);
		b.oldPos.add(d1x*d3*vis*(1-aPart), d1y*d3*vis*(1-aPart));
	}
}
