package com.buddha.math;

import java.util.Arrays;
import java.util.function.Function;

public class BVector {

	public float[] vec;
	public int size;
	
	public BVector() {
		
	}

	public BVector(int size) {
		this.size = size;
		this.vec = new float[size];
	}

	public BVector(float[] vec) {
		this.size = vec.length;
		this.vec = vec;
	}

	public BVector(BVector bvec) {
		this.size = bvec.size;
		this.vec = Arrays.copyOf(bvec.vec, size);
	}

	public BVector(float[] numbers, int startIdx, int size) {
		this.size = size;
		this.vec = new float[size];
		for (int i = 0; i < size; i++) {
			vec[i] = numbers[i + startIdx];
		}
	}

	public void resize(int size) {
		this.vec = Arrays.copyOf(vec, size);
		this.size = size;
	}
	
	public void set(float[] input, int start, int size) {
		for(int i = start; i < start+size; i++) {
			this.vec[i] = input[i-start];
		}
	}

	/**
	 * @param f
	 *            function to be applied elementwise
	 * @return this object for chaining
	 */
	public BVector apply(Function<Float, Float> f) {
		for (int i = 0; i < size; i++) {
			vec[i] = f.apply(vec[i]);
		}
		return this;
	}

	public BVector scale(float scale) {
		for (int i = 0; i < size; i++) {
			vec[i] = vec[i] * scale;
		}
		return this;
	}

	public float average() {
		float avg = 0;
		for (int i = 0; i < size; i++) {
			avg += (vec[i]);
		}
		return avg / size;
	}

	public float variance() {
		float var = 0;
		float avg = average();
		for (int i = 0; i < size; i++) {
			var += (vec[i] - avg) * (vec[i] - avg);
		}
		return var / size;
	}

	public BVector add(BVector x) {
		for (int i = 0; i < size; i++) {
			vec[i] += x.vec[i];
		}
		return this;
	}

	public BVector sub(BVector x) {
		for (int i = 0; i < size; i++) {
			vec[i] -= x.vec[i];
		}
		return this;
	}

	public BVector add(float x) {
		for (int i = 0; i < size; i++) {
			vec[i] += x;
		}
		return this;
	}

	public float dst2(BVector other) {
		float dst2 = 0;
		for (int i = 0; i < size; i++) {
			float diff = other.vec[i] - vec[i];
			dst2 += diff * diff;
		}
		return dst2;
	}

	public float min() {
		float min = Float.MAX_VALUE;
		for (float i : vec) {
			if (i < min) {
				min = i;
			}
		}
		return min;
	}

	public float sum() {
		float sum = 0;
		for (float i : vec) {
			sum += i;
		}
		return sum;
	}

	public void clear() {
		for (int i = 0; i < size; i++) {
			vec[i] = 0;
		}
	}

	public void set(BVector other) {
		for (int i = 0; i < size; i++) {
			vec[i] = other.vec[i];
		}
	}

	@Override
	public String toString() {
		StringBuilder sb = new StringBuilder();
		for (int i = 0; i < size; i++) {
			sb.append(String.format("%2.2f ", vec[i]));
		}
		return sb.toString();
	}

	public static BVector hadamardProd(BVector a, BVector b) {
		BVector v = new BVector(a.size);
		for (int i = 0; i < v.size; i++) {
			v.vec[i] = a.vec[i] * b.vec[i];
		}
		return v;
	}

	public static BVector add(BVector a, BVector b) {
		BVector v = new BVector(a.size);
		for (int i = 0; i < v.size; i++) {
			v.vec[i] = a.vec[i] + b.vec[i];
		}
		return v;
	}

	public static BVector sub(BVector a, BVector b) {
		BVector v = new BVector(a.size);
		for (int i = 0; i < v.size; i++) {
			v.vec[i] = a.vec[i] - b.vec[i];
		}
		return v;
	}

	public static BVector product(BMatrix left, BVector right) {
		BVector v = new BVector(left.rows);
		for (int i = 0; i < v.size; i++) {
			float res = 0;
			for (int j = 0; j < right.size; j++) {
				res += right.vec[j] * left.mat[i][j];
			}
			v.vec[i] = res;
		}
		return v;
	}
	
	public static void product(BMatrix left, BVector right, BVector result) {
		for (int i = 0; i < result.size; i++) {
			float res = 0;
			for (int j = 0; j < right.size; j++) {
				res += right.vec[j] * left.mat[i][j];
			}
			result.vec[i] = res;
		}
	}

	public static BVector scale(BVector a, float scale) {
		BVector v = new BVector(a);
		return v.scale(scale);
	}

}