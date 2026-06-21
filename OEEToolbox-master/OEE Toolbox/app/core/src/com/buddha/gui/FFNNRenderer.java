package com.buddha.gui;

import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.g2d.Batch;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.g2d.TextureAtlas;
import com.badlogic.gdx.graphics.g2d.TextureAtlas.AtlasRegion;
import com.badlogic.gdx.math.MathUtils;
import com.badlogic.gdx.scenes.scene2d.Actor;
import com.badlogic.gdx.scenes.scene2d.InputEvent;
import com.badlogic.gdx.scenes.scene2d.InputListener;
import com.badlogic.gdx.utils.Array;
import com.buddha.agent.Agent;
import com.buddha.math.BVector;
import com.buddha.neural.Brain;
import com.buddha.neural.FFNN;
import com.buddha.neural.GRU;
import com.buddha.render.RenderUtils;
import com.buddha.world.AABB;
import com.buddha.world.Circle;
import com.buddha.world.Constraint;

public class FFNNRenderer extends Actor {
	public Brain brain;
	public Agent agent;
	public AtlasRegion circle;
	public AtlasRegion square;

	public Array<Circle> circles = new Array<Circle>();
	public Array<Circle[]> layers = new Array<Circle[]>();
	public Array<Syn> synapses = new Array<Syn>();
	float neuronR = 4;
	float minStrength;

	public Circle selected = null;
	public boolean mouseDown;
	public float mx = 10000f;
	public float my = 10000f;

	public AABB bounds = new AABB(0, 0, 0, 0);

	public FFNNRenderer(Agent agent, TextureAtlas atlas, float width, float height) {
		this.agent = agent;
		circle = atlas.findRegion("circle");
		square = atlas.findRegion("blank");
		this.brain = agent.brain;
		if (brain instanceof FFNN) {
			initFFNN((FFNN) brain, width, height);
		} else {
			initGRU((GRU) brain, width, height);
		}
	}

	public void initGRU(GRU gru, float width, float height) {
		float cx = width/2f;
		float cy = height/2f+10;
		float r = width/3f;
		float radPart = MathUtils.PI2/gru.outputSize;
		for(int i = 0; i < gru.inputSize; i++) {
			float xPos = cx-r+2*r*(i/((float)gru.inputSize-1));
			addCircle(xPos, 5);
		}
		for(int i = 0; i < gru.outputSize; i++) {
			float xPos = MathUtils.cos(radPart*i)*r+cx;
			float yPos = MathUtils.sin(radPart*i)*r+cy;
			addCircle(xPos, yPos);
		} 
		for(int i = 0; i < gru.outputSize-1; i++) {
			Circle c1 = circles.get(i+gru.inputSize);
			for(int j = i + 1; j < gru.outputSize; j++) {
				Circle c2 = circles.get(j+gru.inputSize);
				connect(c1, c2, 1);
			}
		}
		for(int i = 0; i < gru.inputSize; i++) {
			Circle c1 = circles.get(i);
			for(int j = 0; j < gru.outputSize; j++) {
				Circle c2 = circles.get(j+gru.inputSize);
				connect(c1, c2, 1);
			}
		}
	}

	public void initFFNN(FFNN ffnn, float width, float height) {
		float hDist = 16;
		float vDist = 56;
		for (int j = 0; j < ffnn.layers.length; j++) {
			BVector layer = ffnn.layers[j];
			Circle[] cLayer = new Circle[layer.size];
			float lw = layer.size * hDist;
			for (int i = 0; i < layer.size; i++) {
				Circle c = addCircle(width / 2 - lw / 2 + i * hDist, j * vDist);
				cLayer[i] = c;
			}
			layers.add(cLayer);
		}
		// connect synapses
		for (int inLayer = 1; inLayer < layers.size; inLayer++) {
			// connect to previous layers
			Circle[] toLayer = layers.get(inLayer);
			Circle[] fromLayer = layers.get(inLayer - 1);
			for (int i = 0; i < toLayer.length; i++) {
				for (int j = 0; j < fromLayer.length; j++) {
					connect(toLayer[i], fromLayer[j], ffnn.weights[inLayer - 1].mat[i][j + 1]);
				}
			}
		}
		synapses.shuffle();
	}

	public void connect(Circle c1, Circle c2, float strength) {
		if(strength==0) return;
		synapses.add(new Syn(c1, c2, strength));
	}

	public Circle addCircle(float x, float y) {
		Circle c = new Circle(x, y, neuronR, 1);
		c.particle.friction = 0.97f;
		circles.add(c);
		return c;
	}

	public float getNeuronActivation(int idx) {
		FFNN ffnn = (FFNN) brain;
		for (int j = 0; j < ffnn.layers.length; j++) {
			float[] layer = ffnn.layers[j].vec;
			if (idx < layer.length) {
				return layer[idx];
			} else {
				idx -= layer.length;
			}
		}
		System.err.println("Index isn't a neuron.");
		return -1;
	}

	public float getTX(float x) {
		return x - bounds.x1;
	}

	public float getTY(float y) {
		return y - bounds.y1;
	}

	public void drawSynapse(Batch batch, Syn s) {
		if (s.strength < 0) {
			batch.setColor(1, 0.41f, 0.38f, 1);
		} else {
			batch.setColor(0.47f, .78f, 0.47f, 1);
		}
		RenderUtils.drawLine((SpriteBatch) batch, getTX(s.c.a.pos.x), getTY(s.c.a.pos.y), getTX(s.c.b.pos.x),
				getTY(s.c.b.pos.y), Math.abs(s.strength), square);
	}

	public void drawCircle(Batch batch, float x, float y, float r) {
		batch.draw(circle, getTX(x - r), getTY(y - r), r * 2, r * 2);
	}

	@Override
	public void act(float delta) {
		super.act(delta);

		bounds.setWidth(getParent().getWidth());
		bounds.setHeight(getParent().getHeight() - 30);
		for (Circle c : circles) {
			if (bounds.checkCollisions(c)) {
				if (c.particle.getSpeed() > 20f) {
					agent.seizure();
				}
			}
			c.update();
		}
		for (Syn s : synapses) {
			s.c.solve();
		}
		if (selected != null && mouseDown) {
			selected.particle.pos.set(mx, my);
		}
	}

	@Override
	public void draw(Batch batch, float parentAlpha) {
		super.draw(batch, parentAlpha);
		if (agent.hasGRU) {
			drawGRU(batch);
		} else {
			drawFFNN(batch);
		}
	}

	public void drawGRU(Batch batch) {
		GRU gru = (GRU) brain;
		bounds.x1 = getParent().getX();
		bounds.y1 = getParent().getY();
		float nr, ng, nb;
		for (Syn s : synapses) {
			if (Math.abs(s.strength) > minStrength) {
				drawSynapse(batch, s);
			}
		}
		for (int i = 0; i < circles.size; i++) {
			Circle c = circles.get(i);
			batch.setColor(Color.WHITE);
			float dst = c.particle.pos.dst(mx, my);
			float fact = neuronR + 2 * neuronR - 2 * neuronR * Math.min(100, dst) / 100f;
			float df = 0.702f;
			c.radius = fact;
			if(i < gru.inputSize) {
				float activation = MathUtils.clamp(agent.input.vec[i], -1, 1);
				if (activation > 0) {
					nr = ng = nb = activation;
				} else {
					nr = -activation;
					ng = -0.65f * activation;
					nb = -.81f * activation;
				}
			} else {
				int idx = i-gru.inputSize;
				nr = (gru.bh.vec[idx]+1)/2f;
				ng = (gru.br.vec[idx]+1)/2f;
				nb = (gru.bz.vec[idx]+1)/2f;
			}
			batch.setColor(nr * 0.8f, ng * 0.8f, nb * 0.8f, 1f);
			drawCircle(batch, c.getX(), c.getY(), c.radius);
			batch.setColor(nr, ng, nb, 1f);
			drawCircle(batch, c.getX() - 0.2f * c.radius * df, c.getY() + 0.2f * c.radius * df, c.radius * 0.8f);
		}
	}

	public void drawFFNN(Batch batch) {
		float nr, ng, nb = 0;
		bounds.x1 = getParent().getX();
		bounds.y1 = getParent().getY();
		for (Syn s : synapses) {
			if (Math.abs(s.strength) > minStrength) {
				drawSynapse(batch, s);
			}
		}
		for (int i = 0; i < circles.size; i++) {
			Circle c = circles.get(i);
			float activation = getNeuronActivation(i);
			activation = MathUtils.clamp(activation, -1, 1);
			if (activation > 0) {
				nr = ng = nb = activation;
			} else {
				nr = -activation;
				ng = -0.65f * activation;
				nb = -.81f * activation;
			}
			batch.setColor(nr, ng, nb, 1f);
			float dst = c.particle.pos.dst(mx, my);
			float fact = neuronR + 2 * neuronR - 2 * neuronR * Math.min(100, dst) / 100f;
			float df = 0.702f;
			c.radius = fact;
			batch.setColor(nr * 0.8f, ng * 0.8f, nb * 0.8f, 1f);
			drawCircle(batch, c.getX(), c.getY(), c.radius);
			batch.setColor(nr, ng, nb, 1f);
			drawCircle(batch, c.getX() - 0.2f * c.radius * df, c.getY() + 0.2f * c.radius * df, c.radius * 0.8f);
		}
	}

	private class Syn {
		public Constraint c;
		public float strength;

		public Syn(Circle c1, Circle c2, float strength) {
			c = new Constraint(c1.particle, c2.particle);
			c.softness = 0.1f;
			this.strength = strength;
		}
	}

	public final InputListener inputListener = new InputListener() {
		public boolean touchDown(InputEvent event, float x, float y, int pointer, int button) {
			selected = null;
			mx = x + bounds.x1;
			my = y + bounds.y1;
			mouseDown = true;
			for (Circle c : circles) {
				if (c.contains(mx, my)) {
					selected = c;
				}
			}
			return true;
		}

		public void touchDragged(InputEvent event, float x, float y, int pointer) {
			mx = x + bounds.x1;
			my = y + bounds.y1;
		}

		public void touchUp(InputEvent event, float x, float y, int pointer, int button) {
			mouseDown = false;
		}

		@Override
		public boolean mouseMoved(InputEvent event, float x, float y) {
			mx = x + bounds.x1;
			my = y + bounds.y1;
			return super.mouseMoved(event, x, y);
		}
	};
}
