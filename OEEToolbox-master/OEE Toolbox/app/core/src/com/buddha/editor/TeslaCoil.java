package com.buddha.editor;

import com.badlogic.gdx.math.MathUtils;
import com.buddha.agent.Agent;
import com.buddha.agent.DepthComparable;
import com.buddha.world.Circle;

public class TeslaCoil implements DepthComparable {
	
	public float height = 8;
	public float r = 1;
	public float time;
	public int index;
	public Circle circle;
	
	public TeslaCoil(float x, float y, int index) {
		this.circle = new Circle(x, y, 2f, 100000);
		this.index = index;
	}
	
	public void zap(Agent agent) {
		
	}
	
	public void update() {
		time+=1f/60f;
	}

	@Override
	public float getDepth() {
		return circle.particle.pos.y;
	}

	public float getWidth() {
		return circle.radius;
	}
	
	public float getHeight() {
		return height+MathUtils.sin(time*2f+index);
	}
	
}
