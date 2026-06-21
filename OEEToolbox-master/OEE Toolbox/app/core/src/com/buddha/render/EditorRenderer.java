package com.buddha.render;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.GL20;
import com.badlogic.gdx.graphics.Pixmap.Format;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.g2d.TextureAtlas;
import com.badlogic.gdx.graphics.g2d.TextureAtlas.AtlasRegion;
import com.badlogic.gdx.graphics.glutils.FrameBuffer;
import com.badlogic.gdx.math.MathUtils;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.utils.Array;
import com.buddha.agent.Agent;
import com.buddha.agent.DepthComparable;
import com.buddha.agent.Team;
import com.buddha.editor.CloningMachine;
import com.buddha.editor.DustParticle;
import com.buddha.editor.Editor;
import com.buddha.editor.Flame;
import com.buddha.editor.Incinerator;
import com.buddha.editor.Ray;
import com.buddha.editor.StartPosition;
import com.buddha.editor.TeslaCoil;
import com.buddha.editor.WorldButton;
import com.buddha.simulation.Simulation;
import com.buddha.simulation.SimulationScreen;
import com.buddha.world.AABB;

public class EditorRenderer {

	public SimulationScreen screen;
	public TextureAtlas atlas;
	public SpriteBatch batch;
	public RenderUtils utils;
	public Camera cam;
	public AgentRenderer agentRenderer;
	public FieldRenderer fieldRenderer;
	public TextRenderer textRenderer;
	public FrameBuffer fbo;
	public AtlasRegion square;
	public AtlasRegion circle;
	public float time;

	public static final Color nameColorFixed = new Color(0.8f, 0.92f, 0.8f, 1);
	public static final Color nameColorEditable = new Color(0.75f, 0.6f, 0.92f, 1);
	public static final Color buttonColor = new Color(0.6f, 0.9f, 0.65f, 1);
	public static final Color buttonColorHighlighted = new Color(0.7f, 1f, 0.72f, 1);

	public EditorRenderer(SimulationScreen screen, SpriteBatch batch, TextureAtlas atlas, Camera cam) {
		this.screen = screen;
		this.batch = batch;
		this.atlas = atlas;
		this.cam = cam;
		this.square = atlas.findRegion("blank");
		this.circle = atlas.findRegion("circle");
		this.utils = new RenderUtils(batch, square);
		this.agentRenderer = new AgentRenderer(batch, atlas, utils);
		this.fieldRenderer = new FieldRenderer(batch, atlas, utils);
		this.textRenderer = new TextRenderer(batch);
		try {
			fbo = new FrameBuffer(Format.RGBA8888, 1024, 512, false);
		} catch (Exception e) {
			System.err.print("Can't create framebuffer, no shadows supported.");
		}
	}

	public void render(Editor editor) {
		time += 1f / 60f;
		// draw fields
		batch.setProjectionMatrix(cam.cam.combined);
		batch.begin();
		AABB field = editor.world.bounds;
		batch.setColor(203 / 255f, 89 / 255f, 75 / 255f, 1f);
		batch.draw(square, field.x1, field.y1, field.getWidth(), field.getHeight());
		fieldRenderer.drawField(Simulation.bounds);
		for (StartPosition startPosition : editor.startPositions) {
			drawStartPosition(editor, startPosition);
		}

		for (WorldButton wb : editor.worldButtons) {
			drawWorldButton(wb);
		}
		for (Incinerator incinerator : editor.incinerators) {
			drawIncinerator(incinerator);
		}
		if (editor.selected != null) {
			batch.setColor(1, 1, 1, 0.5f);
			utils.drawCircle(circle, editor.selected.circle.getX(), editor.selected.circle.getY(),
					3 + MathUtils.sin(time * 10) * 0.4f);
		}
		textRenderer.beginText(screen.width, screen.height);
		for (Agent agent : editor.agents) {
			Vector2 pos = cam.worldToScreen(agent.circle.getX(), agent.circle.getY() - 1);
			textRenderer.drawCentered(textRenderer.blockyLarge, agent.gene.properties.getSProperty("name"),
					agent.editable ? nameColorEditable : nameColorFixed, pos.x, pos.y);
		}
		textRenderer.endText(cam);
		batch.end();

		// draw shadows
		if (fbo != null) {
			fbo.begin();
			Gdx.gl.glClearColor(0, 0, 0, 0);
			Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT);
			batch.begin();
			for (Agent agent : editor.agents) {
				agentRenderer.drawShadow(agent);
			}
			for (TeslaCoil coil : editor.teslaCoils) {
				utils.drawCircle(circle, coil.circle.particle.pos.x, coil.circle.particle.pos.y - 0.2f,
						coil.getWidth() / 2f);
			}
			for (DustParticle dp : editor.dustParticles) {
				batch.setColor(0, 0, 0, 1);
				utils.drawCircle(circle, dp.particle.pos.x, dp.particle.pos.y, dp.r * dp.alpha);
			}
			batch.end();
			fbo.end();
		}
		batch.begin();
		batch.setColor(1, 1, 1, 0.3f);
		batch.draw(fbo.getColorBufferTexture(), cam.x - cam.width * cam.scale / 2f, cam.y + cam.height * cam.scale / 2f,
				cam.width * cam.scale, -cam.height * cam.scale);

		// draw rest
		editor.entities.sort((a, b) -> Float.compare(b.getDepth(), a.getDepth()));
		for (DepthComparable entity : editor.entities) {
			if (entity instanceof Agent) {
				Agent a = (Agent) entity;
				agentRenderer.drawAgent(a, cam);
			} else if (entity instanceof TeslaCoil) {
				drawTeslaCoil((TeslaCoil) entity);
			} else if (entity instanceof CloningMachine) {
				drawCloningMachine((CloningMachine) entity);
			} else if (entity instanceof Ray) {
				Ray ray = (Ray) entity;
				batch.setColor(0.6f, 0.9f, 1f, 1f);
				drawRay(ray.from.x, ray.from.y + ray.from.z * cam.depth, ray.to.x, ray.to.y + ray.to.z * cam.depth);
			} else if (entity instanceof DustParticle) {
				DustParticle dp = (DustParticle) entity;
				drawDustParticle(dp);
			} else if (entity instanceof Flame) {
				Flame flame = (Flame) entity;
				if (editor.incinerators.get(0).bounds.contains(flame.x, flame.y))
					drawFlame(flame);
			}
		}
		batch.end();
	}

	public void drawIncinerator(Incinerator incinerator) {
		Color fireCol = new Color(89 / 100f, 35 / 100f, 13 / 100f, 1);
		for (int i = 0; i < 4; i++) {
			batch.setColor(fireCol.r, fireCol.g, fireCol.b, 0.4f);
			float rand = (float) MathUtils.random.nextGaussian() * 0.4f;
			batch.draw(square, incinerator.bounds.x1 - rand, incinerator.bounds.y1 - rand * 0.8f,
					incinerator.bounds.getWidth() + 2 * rand, incinerator.bounds.getHeight() + 2 * rand * 0.8f);
		}
		batch.setColor(fireCol);
		batch.draw(square, incinerator.bounds.x1, incinerator.bounds.y1, incinerator.bounds.getWidth(),
				incinerator.bounds.getHeight());
	}

	public void drawFlame(Flame flame) {
		Color fireCol = new Color(89 / 100f, 38 / 100f, 14 / 100f, 1);
		Color inside = new Color(89f / 100f, 72f / 100f, 13f / 100f, 0.6f);
		float rand = MathUtils.randomTriangular();
		batch.setColor(fireCol);
		utils.drawLine(flame.x, flame.y, flame.x, flame.y + flame.fac * (flame.height * cam.depth + rand),
				flame.width / 2f, 0);
		batch.setColor(inside);
		utils.drawLine(flame.x, flame.y, flame.x, flame.y + flame.fac * (flame.height * 0.5f * cam.depth + rand * 0.5f),
				flame.width * 0.5f / 2f, 0);
		batch.setColor(inside);
		utils.drawLine(flame.x, flame.y, flame.x, flame.y + flame.fac * (flame.height * 0.3f * cam.depth + rand * 0.3f),
				flame.width * 0.3f / 2f, 0);
	}

	public void drawWorldButton(WorldButton button) {
		float height = button.down ? 0.4f : 1f;
		float shade = 0.8f;
		Color buttonColor = button.highlighted ? buttonColorHighlighted : EditorRenderer.buttonColor;
		batch.setColor(buttonColor.r * shade, buttonColor.g * shade, buttonColor.b * shade, 1);
		batch.draw(square, button.bounds.x1, button.bounds.y1, button.bounds.getWidth(), button.bounds.getHeight());
		batch.setColor(buttonColor);
		batch.draw(square, button.bounds.x1, button.bounds.y1 + height * cam.depth, button.bounds.getWidth(),
				button.bounds.getHeight());
		batch.setColor(buttonColor.r * shade, buttonColor.g * shade, buttonColor.b * shade, 1);
		utils.drawLine(button.bounds.getCX() - 1, button.bounds.getCY() + height * cam.depth, button.bounds.getCX() + 1,
				button.bounds.getCY() + height * cam.depth, 0.4f);
		utils.drawLine(button.bounds.getCX(), button.bounds.getCY() + 1 + height * cam.depth, button.bounds.getCX(),
				button.bounds.getCY() + height * cam.depth - 1, 0.4f);
	}

	public void drawDustParticle(DustParticle dp) {
		batch.setColor(0.8f, 0.8f, 0.8f, 1);
		utils.drawCircle(circle, dp.particle.pos.x, dp.particle.pos.y + dp.particle.pos.z * cam.depth, dp.r * dp.alpha);
	}

	public void drawStartPosition(Editor editor, StartPosition startPosition) {
		Agent grabbed = editor.grabbed;
		float tint = 0.6f;
		float z = 0;
		if (grabbed != null) {
			Vector2 pos = grabbed.circle.particle.pos;
			if (startPosition.region.contains(pos.x, pos.y)) {
				z = 1;
				tint = 1;
			}
		}
		batch.setColor(0, 0, 0, 0.3f);
		batch.draw(square, startPosition.region.x1, startPosition.region.y1, startPosition.region.getWidth(),
				startPosition.region.getHeight());
		if (startPosition.agent != null) {
			batch.setColor(0, tint, 0, 0.3f);
		} else {
			batch.setColor(tint, tint, tint, 0.5f);
		}
		batch.draw(square, startPosition.region.x1, startPosition.region.y1 + z, startPosition.region.getWidth(),
				startPosition.region.getHeight());
	}

	public void drawTeam(boolean left) {
		Array<AABB> startPositions = left ? Team.startPositionsLeft : Team.startPositionsRight;
		batch.setColor(0.7f, 0.1f, 0.1f, 0.4f);
		for (AABB reg : startPositions) {
			batch.draw(square, reg.x1, reg.y1, reg.getWidth(), reg.getHeight());
		}
	}

	public void drawCloningMachine(CloningMachine machine) {
		int nCoils = machine.teslaCoils.size;
		batch.setColor(0.6f, 0.9f, 1f, 1f);
		for (int i = 0; i < nCoils; i++) {
			TeslaCoil coil0 = machine.teslaCoils.get(i);
			TeslaCoil coil1 = machine.teslaCoils.get((i + nCoils + 1) % nCoils);
			drawRay(coil0.circle.particle.pos.x, coil0.circle.particle.pos.y + coil0.height * cam.depth,
					coil1.circle.particle.pos.x, coil1.circle.particle.pos.y + coil1.height * cam.depth);
		}
	}

	public void drawRay(float x1, float y1, float x2, float y2) {
		float dx = x2 - x1;
		float dy = y2 - y1;
		float x;
		float y;
		float l = (float) Math.sqrt(dx * dx + dy * dy);
		float invl = 1f / l;
		int points = Math.max(3, (int) l);
		dx *= invl;
		dy *= invl;
		float px = -dy;
		float py = dx;
		float[] verts = new float[points * 2];
		for (int i = 0; i < points; i++) {
			float fac = ((float) i) / (points - 1);
			if (i == 0 || i == points - 1) {
				x = x1 + (x2 - x1) * fac;
				y = y1 + (y2 - y1) * fac;
			} else {
				x = x1 + (x2 - x1) * fac + MathUtils.randomTriangular(-1, 1) * px;
				y = y1 + (y2 - y1) * fac + MathUtils.randomTriangular(-1, 1) * py;
			}
			verts[i * 2] = x;
			verts[i * 2 + 1] = y;
		}
		for (int i = 1; i < points; i++) {
			utils.drawLine(verts[(i - 1) * 2], verts[(i - 1) * 2 + 1], verts[i * 2], verts[i * 2 + 1], 0.1f);
		}
	}

	public void drawTeslaCoil(TeslaCoil teslaCoil) {
		float shade = 0.8f;
		Color mainColor = new Color(0.7f, 0.8f, 1f, 1);
		Color shadeColor = new Color(0.7f * shade, 0.8f * shade, 1f * shade, 1);
		Color sphereColor = new Color(1f, 0.8f, 0.9f, 1);
		Color sphereShade = new Color(0.9f * shade, 0.8f * shade, 0.9f * shade, 1);
		Vector2 pos = teslaCoil.circle.particle.pos;
		int bars = 5;
		float width = teslaCoil.getWidth();
		float height = teslaCoil.getHeight();
		batch.setColor(mainColor);
		RenderUtils.drawLine(batch, pos.x, pos.y, pos.x, pos.y + cam.depth * height, width / 2f, 0, square);
		batch.draw(circle, pos.x - width / 2f, pos.y - width * cam.depth / 2f, width, width * cam.depth);
		batch.setColor(shadeColor);
		for (int i = 0; i < bars; i++) {
			float yy = pos.y + height / 4f + (float) i / bars * (height / 2f);
			float w = width * (1 - (yy - pos.y) / height);
			utils.drawLine(pos.x - w, yy, pos.x + w, yy, 0.15f);
		}
		batch.setColor(sphereShade);
		utils.drawCircle(circle, pos.x, pos.y + height * cam.depth, teslaCoil.r);
		batch.setColor(sphereColor);
		utils.drawCircle(circle, pos.x - 0.1f, pos.y + 0.1f + height * cam.depth, teslaCoil.r * 0.85f);
	}

}
