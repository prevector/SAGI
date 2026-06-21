package com.buddha.render;

import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.g2d.TextureAtlas;
import com.badlogic.gdx.graphics.g2d.TextureAtlas.AtlasRegion;
import com.buddha.world.AABB;

public class FieldRenderer {

	public SpriteBatch batch;
	public RenderUtils utils;
	public AtlasRegion square;
	public AtlasRegion circle;

	public static Color grassColor1 = new Color(119f / 255f * 0.7f, 221f / 255f * 0.7f, 119f / 255f * 0.7f, 1f);
	public static Color grassColor2 = new Color(119f / 255f * 0.63f, 221f / 255f * 0.63f, 119f / 255f * 0.63f, 1f);

	public FieldRenderer(SpriteBatch batch, TextureAtlas atlas, RenderUtils utils) {
		this.batch = batch;
		this.square = atlas.findRegion("blank");
		this.circle = atlas.findRegion("circle");
		this.utils = utils;
	}

	public void drawField(AABB bounds) {
		Color lineColor = Color.WHITE;
		float lineWidth = 0.2f;
		int divisions = 8;
		float dw = bounds.getWidth() / divisions;
		batch.setColor(grassColor1);
		batch.draw(square, bounds.x1, bounds.y1, bounds.getWidth(), bounds.getHeight());
		for (int i = 0; i < divisions; i++) {
			batch.setColor(i % 2 == 0 ? grassColor1 : grassColor2);
			batch.draw(square, bounds.x1 + dw * i, bounds.y1, dw, bounds.getHeight());
		}
		batch.setColor(lineColor);
		utils.drawCircle(circle, bounds.getCX(), bounds.getCY(), bounds.getHeight() / 6f);
		batch.setColor(grassColor1);
		utils.drawCircle(circle, bounds.getCX(), bounds.getCY(), bounds.getHeight() / 6f - lineWidth * 2);
		batch.setColor(lineColor);
		utils.drawLine(bounds.getCX(), bounds.y2, bounds.getCX(), bounds.y1, lineWidth);
		utils.drawCircle(circle, bounds.getCX(), bounds.getCY(), bounds.getHeight() / 100f);
		RenderUtils.drawLineRect(batch, bounds.x1, bounds.y1, bounds.x2 - bounds.x1, bounds.y2 - bounds.y1, lineWidth,
				square);
		RenderUtils.drawLineRect(batch, bounds.x1, bounds.y1 + bounds.getHeight() / 4f, bounds.getWidth() / 8f,
				bounds.getHeight() * 2f / 4f, lineWidth, square);
		RenderUtils.drawLineRect(batch, bounds.x2 - bounds.getWidth() / 8f, bounds.y1 + bounds.getHeight() / 4f,
				bounds.getWidth() / 8f, bounds.getHeight() * 2f / 4f, lineWidth, square);
	}
}
