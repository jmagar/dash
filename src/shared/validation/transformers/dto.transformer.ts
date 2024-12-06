import { Transform, type ClassTransformOptions, type TransformFnParams } from 'class-transformer';

export function TransformToDate() {
  return Transform(({ value }: TransformFnParams) => {
    if (!value) return value;
    const date = new Date(value);
    return isNaN(date.getTime()) ? value : date;
  });
}

export function TransformToBoolean() {
  return Transform(({ value }: TransformFnParams) => {
    if (value === null || value === undefined) return value;
    return value === true || value === 'true' || value === 1 || value === '1';
  });
}

export function TransformToNumber() {
  return Transform(({ value }: TransformFnParams) => {
    if (value === null || value === undefined) return value;
    const num = Number(value);
    return isNaN(num) ? value : num;
  });
}

export function TransformToArray() {
  return Transform(({ value }: TransformFnParams) => {
    if (value === null || value === undefined) return value;
    return Array.isArray(value) ? value : [value];
  });
}

export function TransformTrim() {
  return Transform(({ value }: TransformFnParams) => {
    if (typeof value !== 'string') return value;
    return value.trim();
  });
}

export function TransformToLowerCase() {
  return Transform(({ value }: TransformFnParams) => {
    if (typeof value !== 'string') return value;
    return value.toLowerCase();
  });
}

export function TransformToUpperCase() {
  return Transform(({ value }: TransformFnParams) => {
    if (typeof value !== 'string') return value;
    return value.toUpperCase();
  });
}

export const defaultTransformOptions: ClassTransformOptions = {
  enableCircularCheck: true,
  enableImplicitConversion: true,
  excludeExtraneousValues: true,
  exposeDefaultValues: true,
};
