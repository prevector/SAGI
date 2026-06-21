package com.buddha.render;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.GL20;
import com.badlogic.gdx.graphics.Pixmap.Format;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.graphics.g2d.GlyphLayout;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.g2d.TextureAtlas;
import com.badlogic.gdx.graphics.g2d.TextureAtlas.AtlasRegion;
import com.badlogic.gdx.graphics.glutils.FrameBuffer;
import com.badlogic.gdx.math.MathUtils;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.utils.Array;
import com.buddha.agent.Agent;
import com.buddha.agent.Ball;
import com.buddha.agent.BallCollisionHandler;
import com.buddha.agent.BallPositionInput;
import com.buddha.agent.FieldEdgeInput;
import com.buddha.agent.GoalPositionInput;
import com.buddha.agent.InputModel;
import com.buddha.agent.PlayerInput;
import com.buddha.simulation.Properties;
import com.buddha.simulation.Simulation;
import com.buddha.simulation.SimulationScreen;
import com.buddha.world.AABB;
import com.buddha.world.World;

public class SimulationRenderer {

	public RenderUtils utils;
	public SpriteBatch batch;
	public AgentRenderer agentRenderer;
	public FieldRenderer fieldRenderer;
	public TextRenderer textRenderer;
	public Camera cam;
	public AtlasRegion circle;
	public AtlasRegion square;
	private Simulation sim;
	public Agent selected;
	public boolean fancy = true;
	public FrameBuffer fbo;
	boolean started = false;

	public static Color ballColor = new Color(0.4f, 0.4f, 0.4f, 1);
	public static Color ballColorShade = new Color(0.35f, 0.35f, 0.35f, 1);
	public static Color leftScoreColor = new Color(1f, 0.41f, 0.38f, 1);
	public static Color rightScoreColor = new Color(0.68f, 0.78f, 1, 1);
	public static Color nameColor = new Color(0.8f, 0.92f, 0.8f, 1);
	public static Color randomColors;

	public SimulationRenderer(SpriteBatch batch, TextureAtlas atlas, Camera cam) {
		this.batch = batch;
		this.cam = cam;
		circle = atlas.findRegion("circle");
		square = atlas.findRegion("blank");
		utils = new RenderUtils(batch, square);
		agentRenderer = new AgentRenderer(batch, atlas, utils);
		fieldRenderer = new FieldRenderer(batch, atlas, utils);
		textRenderer = new TextRenderer(batch);
		// try framebuffer
		try {
			fbo = new FrameBuffer(Format.RGBA8888, 1024, 512, false);
		} catch (Exception e) {
			System.err.print("Can't create framebuffer, no shadows supported.");
		}
	}

	public void render(Simulation sim, SimulationScreen screen) {
		this.sim = sim;
		World world = sim.world;
		if (!started) {
			started = true;
			this.centerCamera();
		}
		batch.setProjectionMatrix(cam.cam.combined);
		batch.begin();
		// render field
		AABB bounds = world.bounds;
		if (bounds != null) {
			fieldRenderer.drawField(bounds);
		}
		if (selected != null)
			drawInfo(selected);
		// render player names
		textRenderer.beginText(screen.width, screen.height);
		if (Properties.current.getBProperty("show names")) {
			for (Agent agent : sim.agents) {
				Vector2 pos = cam.worldToScreen(agent.circle.getX(), agent.circle.getY() - 1);
				textRenderer.drawCentered(textRenderer.blockyLarge, agent.gene.properties.getSProperty("name"),
						nameColor, pos.x, pos.y);
			}
		}
		textRenderer.endText(cam);
		renderTime(textRenderer.blocky);
		if (fancy) {
			drawShadows();
		}
		sim.allAgents.sort((a, b) -> Float.compare(b.getDepth(), a.getDepth()));
		for (Agent agent : sim.allAgents) {
			if (agent.inactive()) {
				drawAgent(agent);
			}
		}
		for (Ball ball : sim.balls) {
			drawBall(ball);
		}
		for (Agent agent : sim.allAgents) {
			if (!agent.inactive())
				drawAgent(agent);
		}

		// render goals
		for (AABB goal : sim.goals) {
			batch.setColor(1, 1, 1, 0.5f);
			batch.draw(square, goal.x1, goal.y1, goal.getWidth(), goal.getHeight());
		}

		batch.end();
	}

	private void drawBall(Ball ball) {
		float r = ball.circle.radius;
		float grid = r * 1.2f;
		float dotSize = 0.3f;
		float y = ball.circle.getY() + ball.z * cam.depth;
		int minX = ((int) ((ball.circle.getX() - r) / grid));
		int minY = ((int) ((y - r) / grid));
		int rn = (int) (2 * r / grid) + 1;
		batch.setColor(ballColorShade);
		utils.drawCircle(circle, ball.circle.getX(), y, r * 1.3f);
		batch.setColor(ballColor);
		utils.drawCircle(circle, ball.circle.getX(), y, ball.circle.radius);
		batch.setColor(ballColorShade);
		for (int i = -1; i < rn + 1; i++) {
			for (int j = -1; j < rn + 1; j++) {
				float xx = (minX + i) * grid + (ball.circle.getX() * 2) % grid;
				float yy = (minY + j) * grid + (ball.circle.getY() * 2) % grid;
				float dx = xx - ball.circle.getX();
				float dy = yy - y;
				if (dx * dx + dy * dy < r * r) {
					float l = (float) Math.sqrt(dx * dx + dy * dy);
					float fac = (float) Math.sqrt(1 - (l / r) * (l / r));
					dx = fac * dotSize * dx / (l);
					dy = fac * dotSize * dy / (l);
					RenderUtils.drawLine(batch, xx - dx, yy - dy, xx + dx, yy + dy, dotSize, circle);
				}
			}
		}
	}

	public void drawShadows() {
		if (fbo == null)
			return;
		batch.end();
		fbo.begin();
		Gdx.gl.glClearColor(0, 0, 0, 0);
		Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT);
		batch.begin();

		for (Agent agent : sim.allAgents) {
			if (agent.skeleton != null)
				agentRenderer.drawShadow(agent);
		}

		Ball ball = sim.balls.get(0);
		batch.setColor(Color.BLACK);
		utils.drawCircle(circle, ball.circle.getX(), ball.circle.getY() - 0.5f, ball.circle.radius);

		batch.end();
		fbo.end();
		batch.begin();
		batch.setColor(1, 1, 1, 0.3f);
		batch.draw(fbo.getColorBufferTexture(), cam.x - cam.width * cam.scale / 2f, cam.y + cam.height * cam.scale / 2f,
				cam.width * cam.scale, -cam.height * cam.scale);
	}

	public void setSelected(Agent agent) {
		this.selected = agent;
	}

	public void drawAgent(Agent agent) {
		if (fancy) {
			agentRenderer.drawAgent(agent, cam);
		} else {
			batch.setColor(agent.getColor());
			utils.drawCircle(circle, agent.circle.getX(), agent.circle.getY(), agent.circle.radius);
			batch.setColor(Color.BLACK);
			float x2 = agent.circle.getX() + MathUtils.cos(agent.direction);
			float y2 = agent.circle.getY() + MathUtils.sin(agent.direction);
			utils.drawLine(agent.circle.getX(), agent.circle.getY(), x2, y2, 0.3f);
		}
	}

	public void drawInfo(Agent agent) {
		// TODO: make
		Vector2 pos = agent.circle.particle.pos;
		InputModel inputModel = agent.inputModel;
		batch.setColor(1, 1, 1, 0.3f);
		float cutoff = Properties.current.getFProperty("cutoff");
		Array<PlayerInput> playerInputs = inputModel.getElementsOf(PlayerInput.class);
		Array<BallPositionInput> ballInputs = inputModel.getElementsOf(BallPositionInput.class);
		Array<GoalPositionInput> goalPositionInputs = inputModel.getElementsOf(GoalPositionInput.class);
		Array<FieldEdgeInput> fieldEdgeInputs = inputModel.getElementsOf(FieldEdgeInput.class);
		if (playerInputs != null)
			for (PlayerInput pi : playerInputs) {
				drawInfo(agent, pi.startIdx, pi.angle, pi.distance, agent.cutoff);
			}
		if (ballInputs != null)
			for (BallPositionInput bpi : ballInputs) {
				drawInfo(agent, bpi.startIdx, bpi.distance, bpi.angle, agent.cutoff);
			}
		if (goalPositionInputs != null)
			for (GoalPositionInput gpi : goalPositionInputs) {
				drawInfo(agent, gpi.startIdx, gpi.distance, gpi.angle, agent.cutoff);
			}
		if (fieldEdgeInputs != null)
			for (FieldEdgeInput fei : fieldEdgeInputs) {
				drawInfo(agent, fei.startIdx, fei.distance, fei.angle, agent.cutoff);
			}
		drawCone(pos.x, pos.y, cutoff, agent.direction - agent.fov / 2f, agent.fov);
		BallCollisionHandler bh = agent.ballHandler;
		float angle = bh.getAngle(agent);
		float magnitude = bh.getMagnitude(agent) * 5f;
		batch.setColor(1f, .41f, .38f, 1f);
		drawArrow(pos.x, pos.y, magnitude, angle);
	}

	public void drawInfo(Agent a, int idx, boolean distance, boolean angle, float cutoff) {
		if (!distance && !angle)
			return;
		int counter = idx;
		float r = distance ? (1 - a.input.vec[counter++]) * cutoff : 5;
		float theta = angle ? a.input.vec[counter++] : 0;
		drawRadialLine(a.circle.getX(), a.circle.getY(), r, theta + a.direction);
	}

	public void drawRadialLine(float x0, float y0, float r, float theta) {
		float lw = 0.1f;
		utils.drawLine(x0, y0, x0 + MathUtils.cos(theta) * r, y0 + MathUtils.sin(theta) * r, lw);
		utils.drawCircle(circle, x0 + MathUtils.cos(theta) * r, y0 + MathUtils.sin(theta) * r, lw * 4);
		utils.drawCircle(circle, x0, y0, lw * 4);
	}

	public void drawArrow(float x0, float y0, float r, float theta) {
		float x1 = x0 + MathUtils.cos(theta) * r;
		float y1 = y0 + MathUtils.sin(theta) * r;
		float arrowRad = MathUtils.PI / 4f;
		float al = 1f;
		float p1x = x1 + MathUtils.cos(theta + MathUtils.PI - arrowRad) * al;
		float p1y = y1 + MathUtils.sin(theta + MathUtils.PI - arrowRad) * al;
		float p2x = x1 + MathUtils.cos(theta + MathUtils.PI + arrowRad) * al;
		float p2y = y1 + MathUtils.sin(theta + MathUtils.PI + arrowRad) * al;
		float aw = 0.2f;
		utils.drawLine(x0, y0, x1, y1, aw);
		utils.drawLine(x1, y1, p1x, p1y, aw);
		utils.drawLine(x1, y1, p2x, p2y, aw);
		utils.drawCircle(circle, x1, y1, aw);
		utils.drawCircle(circle, p1x, p1y, aw);
		utils.drawCircle(circle, p2x, p2y, aw);
	}

	public void drawCone(float x0, float y0, float r, float theta0, float tw) {
		int segments = (int) Math.max(1, tw * 100f / MathUtils.PI2);
		float dtheta = tw / segments;
		for (int i = 0; i < segments; i++) {
			float theta = theta0 + dtheta * i;
			float x1 = x0 + r * MathUtils.cos(theta);
			float y1 = y0 + r * MathUtils.sin(theta);
			float x2 = x0 + r * MathUtils.cos(theta + dtheta);
			float y2 = y0 + r * MathUtils.sin(theta + dtheta);
			utils.drawTriangle(x0, y0, x1, y1, x2, y2);
		}
	}

	public void renderTime(BitmapFont font) {
		GlyphLayout layout = TextRenderer.fontLayout;
		AABB bounds = sim.world.bounds;
		layout.setText(font, Integer.toString(sim.teams.get(1).score));
		Color c0 = sim.teams.get(0).color;
		Color c1 = sim.teams.get(1).color;
		float shade = 0.8f;
		font.getData().setScale(1);
		textRenderer.drawShadedText(font, Integer.toString(sim.teams.get(0).score), c0, shade, bounds.x1 + 0.8f,
				bounds.y1 + layout.height + 1);
		textRenderer.drawShadedText(font, Integer.toString(sim.teams.get(1).score), c1, shade, bounds.x2 - layout.width,
				bounds.y1 + layout.height + 1);
		int minutes = sim.ticks / 3600;
		int seconds = (sim.ticks / 60) % 60;
		String time = String.format("%02d.%02d", minutes, seconds);

		layout.setText(font, time);
		float xoff = 0.5f;
		textRenderer.drawShadedText(font, time, Color.GOLD, 0.8f, bounds.getCX() - layout.width / 2 + xoff,
				bounds.y1 + layout.height + 1);
		layout.setText(font, ".");
		textRenderer.drawShadedText(font, ".", Color.GOLD, 0.8f, bounds.getCX() - layout.width / 2 + xoff,
				bounds.y1 + layout.height + 1 + 3);
	}

	public void centerCamera() {
		AABB bounds = sim.world.bounds;
		cam.x = (bounds.x1 + bounds.x2) / 2f;
		cam.y = (bounds.y1 + bounds.y2) / 2f;
	}

	public void resize(int width, int height) {
		cam.resize(width, height);
	}

	public void dispose() {
		fbo.dispose();
	}
}
