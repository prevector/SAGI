package com.buddha.math;

public class BMatrix {
	public int rows;
	public int collumns;
	public float[][] mat;

	public BMatrix(int rows, int collumns) {
		this.rows = rows;
		this.collumns = collumns;
		mat = new float[rows][];
		for (int i = 0; i < rows; i++) {
			mat[i] = new float[collumns];
		}
	}

	public BMatrix(float[][] mat) {
		this.mat = mat;
		this.rows = mat.length;
		this.collumns = mat[0].length;
	}

	public BMatrix(float[] numbers, int startIdx, int rows, int collumns) {
		this.rows = rows;
		this.collumns = collumns;
		this.mat = new float[rows][collumns];
		int idx = startIdx;
		for (int i = 0; i < rows; i++) {
			for (int j = 0; j < collumns; j++) {
				mat[i][j] = numbers[idx++];
			}
		}
	}

	public int size() {
		return rows * collumns;
	}

	@Override
	public String toString() {
		StringBuilder sb = new StringBuilder();
		for (int i = 0; i < rows; i++) {
			for (int j = 0; j < collumns; j++) {
				sb.append(String.format("%.2f ", mat[i][j]));
			}
			sb.append('\n');
		}
		return sb.toString();
	}

	public static BMatrix mul(BMatrix A, BMatrix B) {
		float[][] result = new float[A.rows][B.collumns];
		for (int i = 0; i < A.rows; i++) {
			for (int j = 0; j < B.collumns; j++) {
				float res = 0;
				for (int k = 0; k < A.collumns; k++) {
					res += A.mat[i][k] * B.mat[k][j];
				}
				result[i][j] = res;
			}
		}
		return new BMatrix(result);
	}

	public static BMatrix build(String from) {
		String[] rows = from.split(";");
		float[][] mat = new float[rows.length][];
		for (int i = 0; i < rows.length; i++) {
			String[] cols = rows[i].split(",");
			float[] col = new float[cols.length];
			for (int j = 0; j < cols.length; j++) {
				col[j] = Float.valueOf((cols[j]));
			}
			mat[i] = col;
		}
		return new BMatrix(mat);
	}

}