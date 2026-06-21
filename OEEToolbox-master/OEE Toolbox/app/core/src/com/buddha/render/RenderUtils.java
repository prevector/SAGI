package com.buddha.render;

import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.g2d.TextureAtlas.AtlasRegion;

public class RenderUtils {
	
	/**
	 * handles all shared renderfunctions
	 */
	
	public AtlasRegion square;
	public SpriteBatch batch;
	
	public RenderUtils(SpriteBatch batch, AtlasRegion square) {
		this.square = square;
		this.batch = batch;
	}
	
	public void drawCircle(AtlasRegion circle, float x, float y, float r) {
		batch.draw(circle, x-r, y-r,2 *r, 2*r);
	}
	
	public void drawLine(float x1, float y1, float x2, float y2, float lineWidth) {
		drawLine(batch, x1, y1, x2, y2, lineWidth, square);
	}
	
	public void drawLineRect(float x, float y, float width, float height, float lineWidth) {
		drawLineRect(batch, x, y, width, height, lineWidth, square);
	}
	
	public void drawLine(float x1, float y1, float x2, float y2, float l1w, float l2w) {
		drawLine(batch, x1, y1, x2, y2, l1w,l2w, square);
	}
	
	public void drawTriangle(float x1, float y1, float x2, float y2, float x3, float y3) {
		float floatBits = batch.getColor().toFloatBits();
		float[] verts = new float[]{x1, y1, floatBits, square.getU(), square.getV(),
									x2, y2, floatBits, square.getU2(), square.getV(),
									x3, y3, floatBits, square.getU2(), square.getV2(),
									x1, y1, floatBits, square.getU(), square.getV2()};
		batch.draw(square.getTexture(), verts, 0, 20);
	}
	
	public static void drawLine(SpriteBatch batch, float x1, float y1, float x2, float y2, float lineWidth, AtlasRegion lineTexture) {
		float xdif = x2-x1;
		float ydif = y2-y1;
		float l2 = xdif*xdif+ydif*ydif;
		float invl = (float)(1/Math.sqrt(l2));
		xdif*=invl*lineWidth;
		ydif*=invl*lineWidth;
		
		float floatBits = batch.getColor().toFloatBits();
		float[] verts = new float[]{x1+ydif, y1-xdif, floatBits, lineTexture.getU(), lineTexture.getV(),
									x1-ydif, y1+xdif, floatBits, lineTexture.getU2(), lineTexture.getV(),
									x2-ydif, y2+xdif, floatBits, lineTexture.getU2(), lineTexture.getV2(),
									x2+ydif, y2-xdif, floatBits, lineTexture.getU(), lineTexture.getV2()};
		batch.draw(lineTexture.getTexture(), verts, 0, 20);
	}
	
	public static void drawLine(SpriteBatch batch, float x1, float y1, float x2, float y2, float l1w, float l2w, AtlasRegion lineTexture) {
		float xdif1 = x2-x1;
		float ydif1 = y2-y1;
		float xdif2 = xdif1;
		float ydif2 = ydif1;
		float l2 = xdif1*xdif1+ydif1*ydif1;
		float invl = (float)(1/Math.sqrt(l2));
		xdif1*=invl*l1w;
		ydif1*=invl*l1w;
		xdif2*=invl*l2w;
		ydif2*=invl*l2w;
		
		float floatBits = batch.getColor().toFloatBits();
		float[] verts = new float[]{x1+ydif1, y1-xdif1, floatBits, lineTexture.getU(), lineTexture.getV(),
									x1-ydif1, y1+xdif1, floatBits, lineTexture.getU2(), lineTexture.getV(),
									x2-ydif2, y2+xdif2, floatBits, lineTexture.getU2(), lineTexture.getV2(),
									x2+ydif2, y2-xdif2, floatBits, lineTexture.getU(), lineTexture.getV2()};
		batch.draw(lineTexture.getTexture(), verts, 0, 20);
	}
	
	public static void drawLineRect(SpriteBatch batch, float x, float y, float width, float height, float lineWidth, AtlasRegion lineTexture) {
		drawLine(batch, x, y, x+width, y, lineWidth, lineTexture);
		drawLine(batch, x+width, y, x+width, y+height, lineWidth, lineTexture);
		drawLine(batch, x+width, y+height, x, y+height, lineWidth, lineTexture);
		drawLine(batch, x, y+height, x, y, lineWidth, lineTexture);
	}
}
