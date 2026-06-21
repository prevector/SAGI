package com.buddha.world;

import com.badlogic.gdx.math.Vector2;

public class Circle {
	public Particle particle;
	public float radius;

	public Circle(float x, float y, float r, float mass) {
		this.particle = new Particle(x, y, mass);
		this.radius = r;
	}

	public void update() {
		particle.update();
	}

	public float getX() {
		return particle.pos.x;
	}

	public float getY() {
		return particle.pos.y;
	}

	public static boolean overlaps(Circle c1, Circle c2) {
		float dx = c2.getX() - c1.getX();
		float dy = c2.getY() - c1.getY();
		float radius2 = (c1.radius + c2.radius);
		return dx * dx + dy * dy <= radius2 * radius2;
	}

	/**
	 * @param atY
	 * @param atX
	 * @param x
	 *            invert velocity along this axis (x and y)
	 * @param y
	 *            should be normalized
	 */
	public void bounce(float xa, float ya, float atX, float atY) {
		particle.bounce(xa, ya, atX, atY);
	}

	public boolean contains(Vector2 v) {
		return v.dst2(particle.pos) < radius * radius;
	}

	public boolean contains(float x, float y) {
		return particle.pos.dst2(x, y) < radius * radius;
	}
}
