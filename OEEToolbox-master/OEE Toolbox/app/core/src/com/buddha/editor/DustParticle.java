package com.buddha.editor;

import com.badlogic.gdx.math.MathUtils;
import com.buddha.agent.DepthComparable;
import com.buddha.phys3d.Particle3;
import com.buddha.simulation.Timer;

public class DustParticle implements DepthComparable {
	public Timer timer;
	
	public Particle3 particle;
	public float r = 0f;
	public float maxR = 1.2f;
	public float alpha = 1f;
	
	public int type;
	
	public DustParticle(float x, float y, float z) {
		timer = new Timer(90);
		particle = new Particle3(x, y, z, 1);
		timer.start();
		particle.addImpulse(0, 0, 0.1f);
	}
	
	public DustParticle(float x, float y, float z, int type) {
		this.type = type;
		timer = new Timer(45);
		particle = new Particle3(x, y, z, 1);
		timer.start();
		particle.addImpulse(0, 
				0, MathUtils.randomTriangular(0, 0.6f));
	}
	
	public void update() {
		int expand = 20;
		int fade = 30;
		int timeLeft = timer.restartTime-timer.time;
		timer.update();
		if(timer.time < expand) {
			r = maxR*((float)timer.time)/expand;
		}
		if(timeLeft < fade) {
			alpha = (float)timeLeft/fade;
		}
		float fac = 0.02f;
		particle.addImpulse(MathUtils.randomTriangular(-1, 1)*fac, 
				MathUtils.randomTriangular(-1, 1)*fac,
				MathUtils.randomTriangular(-1, 1)*fac);
		if(particle.pos.z <= r)  {
			particle.pos.z = r;
			particle.addImpulse(0, 0, -2*particle.getZVel());
		}
		particle.update();
	}
	
	public float getDepth() {
		return particle.pos.y;
	}
}
