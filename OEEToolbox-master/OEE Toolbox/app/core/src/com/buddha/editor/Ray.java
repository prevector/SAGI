package com.buddha.editor;

import com.badlogic.gdx.math.MathUtils;
import com.badlogic.gdx.math.Vector3;
import com.buddha.agent.DepthComparable;
import com.buddha.simulation.Timer;

public class Ray implements DepthComparable {
	
	public Vector3 from;
	public Vector3 to;
	public Timer timer;
	
	public Ray(Vector3 from, Vector3 to) {
		this.from = from;
		this.to = to;
		timer = new Timer(40+MathUtils.random(40));
		timer.start();
	}
	
	public void update() {
		timer.update();
	}
	
	public float getDepth() {
		return to.y;
	}
}
