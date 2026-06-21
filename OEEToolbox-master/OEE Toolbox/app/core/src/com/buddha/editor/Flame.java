package com.buddha.editor;

import com.buddha.agent.DepthComparable;
import com.buddha.simulation.Timer;

public class Flame implements DepthComparable {
	public float x, y;
	public float width, height;
	public Timer timer;
	public float fac = 0;
	int totalTime = 50;
	
	public Flame(float x, float y) {
		this.x = x;
		this.y = y;
		this.width = 2;
		this.height = 4;
		timer = new Timer(totalTime);
		timer.start();
	}
	
	public void update() {
		timer.update();
		fac = 1;
		int timeLeft = totalTime-timer.time;
		if(timer.time < 10) {
			fac = timer.time/10f;
		}
		if(timeLeft < 10) {
			fac = timeLeft/10f;
		}
	}
	
	@Override
	public float getDepth() {
		return y;
	}
}
