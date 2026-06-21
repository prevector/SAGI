package com.buddha.simulation;

public class Timer {
	public int time;
	public int restartTime;
	public boolean enabled;
	
	public Timer(int restartTime) {
		this.restartTime = restartTime;
	}
	
	public void start() {
		if(enabled) {
			return;
		} else {
			enabled = true;
			time = 0;
		}
	}
	
	public boolean update() {
		if(enabled) {
			if(time++>=restartTime) {
				reset();
				return false;
			} else {
				return true;
			}
		} else {
			return false;
		}
	}
	
	public void reset() {
		enabled = false;
		time = 0;
	}
}
