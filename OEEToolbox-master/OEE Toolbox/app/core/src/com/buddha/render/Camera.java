package com.buddha.render;

import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.math.Vector2;

public class Camera {
	public OrthographicCamera cam;
	
	public float x;
	public float y;
	public int width;
	public int height;
	public float scale = 0.1f;
	public float depth = 0.8f;
	
	public Vector2 temp = new Vector2();
	
	public Camera() {
		cam = new OrthographicCamera();
	}
	
	public void update() {
		cam.setToOrtho(false, width*scale, height*scale);
		cam.translate(x-width*scale/2f, y-height*scale/2f);
		cam.update();
	}
	
	public void translate(float x, float y) {
		this.x+=x;
		this.y+=y;
	}
	
	public void resize(int width, int height) {
		this.width = width;
		this.height = height;
	}
	
	public Vector2 screenToWorld(float x, float y) {
		return temp.set(this.x-width*scale/2f+x*scale, this.y-height*scale/2f+(height-y)*scale);
	}

	public void setPosition(float x, float y) {
		this.x = x;
		this.y = y;
	}
	
	public void setScale(float scale) {
		this.scale = scale;
	}

	public Vector2 worldToScreen(float wx, float wy) {
		return temp.set((wx-x)/scale + width/2f, (wy-y)/scale + height/2f);
	}
}
