package com.buddha.world;

import com.badlogic.gdx.math.Vector2;
import com.buddha.phys3d.Particle3;

public class AABB {
	public float x1;
	public float y1;
	public float x2;
	public float y2;

	public AABB(float x1, float y1, float x2, float y2) {
		this.x1 = x1;
		this.y1 = y1;
		this.x2 = x2;
		this.y2 = y2;
	}

	public float getWidth() {
		return x2 - x1;
	}

	public float getHeight() {
		return y2 - y1;
	}

	public void setWidth(float width) {
		this.x2 = width + x1;
	}

	public void setHeight(float height) {
		this.y2 = height + y1;
	}

	public float getCX() {
		return (x2 + x1) / 2f;
	}

	public float getCY() {
		return (y2 + y1) / 2f;
	}

	public Vector2 getCenter() {
		return new Vector2(getCX(), getCY());
	}

	public boolean contains(float x, float y) {
		return Math.abs(x - getCX()) < getWidth() / 2f && Math.abs(y - getCY()) < getHeight() / 2f;
	}

	public boolean checkCollisions(Circle c) {
		boolean hit = false;
		if (c.getX() > x2) {
			c.bounce(1f, 0, x2, c.getY());
			hit = true;
		}
		if (c.getY() > y2) {
			c.bounce(0, 1f, c.getX(), y2);
			hit = true;
		}
		if (c.getX() < x1) {
			c.bounce(1f, 0, x1, c.getY());
			hit = true;
		}
		if (c.getY() < y1) {
			c.bounce(0, 1f, c.getX(), y1);
			hit = true;
		}
		return hit;
	}

	public Vector2 getClosestEdgePoint(Vector2 pos) {
		Vector2 closest = new Vector2();
		int xx = pos.x < getCX() ? 0 : 1;
		int yy = pos.y < getCY() ? 0 : 1;
		float dx = Math.min(pos.x - x1, x2 - pos.x);
		float dy = Math.min(pos.y - y1, y2 - pos.y);
		if (dx < dy) {
			closest.set((1 - xx) * x1 + x2 * xx, pos.y);
		} else {
			closest.set(pos.x, (1 - yy) * y1 + y2 * yy);
		}
		return closest;
	}

	public static boolean insideCollisions(AABB bounds, Circle c) {
		boolean hit = false;
		if (c.getX() > bounds.x2) {
			c.bounce(1f, 0, bounds.x2, c.getY());
			hit = true;
		}
		if (c.getY() > bounds.y2) {
			c.bounce(0, 1f, c.getX(), bounds.y2);
			hit = true;
		}
		if (c.getX() < bounds.x1) {
			c.bounce(1f, 0, bounds.x1, c.getY());
			hit = true;
		}
		if (c.getY() < bounds.y1) {
			c.bounce(0, 1f, c.getX(), bounds.y1);
			hit = true;
		}
		return hit;
	}

	public static void insideCollisions(AABB bounds, Particle3 p) {
		if (p.pos.x < bounds.x1)
			p.pos.x = bounds.x1;
		if (p.pos.y < bounds.y1)
			p.pos.y = bounds.y1;
		if (p.pos.x > bounds.x2)
			p.pos.x = bounds.x2;
		if (p.pos.y > bounds.y2)
			p.pos.y = bounds.y2;
	}

	public void set(float x1, float y1, float x2, float y2) {
		this.x1 = x1;
		this.y1 = y1;
		this.x2 = x2;
		this.y2 = y2;
	}

	public void setCenter(float x, float y) {
		float w = getWidth();
		float h = getHeight();
		set(x-w/2f, y-h/2f, x+w/2f, y+h/2f);
	}
}
