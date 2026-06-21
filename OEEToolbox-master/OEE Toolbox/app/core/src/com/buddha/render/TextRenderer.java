package com.buddha.render;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.graphics.g2d.GlyphLayout;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.g2d.freetype.FreeTypeFontGenerator;
import com.badlogic.gdx.graphics.g2d.freetype.FreeTypeFontGenerator.FreeTypeFontParameter;

public class TextRenderer {

	public BitmapFont blocky;
	public BitmapFont blockyLarge;
	public SpriteBatch batch;
	public OrthographicCamera screenCam = new OrthographicCamera();
	public static final GlyphLayout fontLayout = new GlyphLayout();

	public TextRenderer(SpriteBatch batch) {
		this.batch = batch;
		FreeTypeFontGenerator generator = new FreeTypeFontGenerator(Gdx.files.internal("square-deal.ttf"));
		FreeTypeFontParameter parameter = new FreeTypeFontParameter();
		parameter.size = 8;
		blocky = generator.generateFont(parameter); // font size 8 pixels
		blocky.setUseIntegerPositions(false);
		blocky.setFixedWidthGlyphs("0123456789");

		FreeTypeFontParameter parameterLarge = new FreeTypeFontParameter();
		parameterLarge.size = 18;
		blockyLarge = generator.generateFont(parameterLarge);
		blockyLarge.setUseIntegerPositions(false);
		generator.dispose();
	}

	public void drawShadedText(BitmapFont font, String text, Color c, float shade, float x, float y) {
		font.setColor(c.r * shade * shade, c.g * shade * shade, c.b * shade * shade, 1);
		font.draw(batch, text, x, y - 0.7f * font.getScaleY()); // ?????? fonts
																// behave fukc
		font.setColor(c.r * shade, c.g * shade, c.b * shade, 1);
		font.draw(batch, text, x, y);
	}

	public void drawText(BitmapFont font, String text, Color color, float x, float y) {
		font.setColor(color);
		font.draw(batch, text, x, y);
	}
	
	public void drawCentered(BitmapFont font, String text, Color color, float x, float y) {
		fontLayout.setText(font, text);
		float width = fontLayout.width;
		float height = fontLayout.height;
		font.setColor(color);
		font.draw(batch, text, x-width/2f, y-height/2f);
	}
	
	public void beginText(float width, float height) {
		screenCam.setToOrtho(false, width, height);
		screenCam.update();
		batch.setProjectionMatrix(screenCam.combined);
	}
	
	public void endText(Camera cam) {
		batch.setProjectionMatrix(cam.cam.combined);
	}
}
