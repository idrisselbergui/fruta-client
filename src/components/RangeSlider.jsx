import { useState, useEffect, useRef } from "react";
import "./RangeSlider.css";

export default function RangeSlider({ min = 0, max = 10, step = 1, onChange }) {
  const [minVal, setMinVal] = useState(min);
  const [maxVal, setMaxVal] = useState(max);

  const range = useRef(null);

  // Ensure the highlighted range updates
  useEffect(() => {
    if (range.current) {
      const percent1 = ((minVal - min) / (max - min)) * 100;
      const percent2 = ((maxVal - min) / (max - min)) * 100;

      range.current.style.left = `${percent1}%`;
      range.current.style.width = `${percent2 - percent1}%`;
    }
  }, [minVal, maxVal, min, max]);

  // Notify parent of changes
  useEffect(() => {
    if (onChange) {
      onChange({ min: minVal, max: maxVal });
    }
  }, [minVal, maxVal, onChange]);

  return (
    <div className="slider-container">
      <div className="values">
        <span>{minVal}</span>
        <span>{maxVal}</span>
      </div>

      <div className="slider">
        <div className="slider-track" />
        <div ref={range} className="slider-range" />

        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={minVal}
          onChange={(e) => {
            const value = Math.min(Number(e.target.value), maxVal - step);
            setMinVal(value);
          }}
          className="thumb thumb-left"
        />

        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={maxVal}
          onChange={(e) => {
            const value = Math.max(Number(e.target.value), minVal + step);
            setMaxVal(value);
          }}
          className="thumb thumb-right"
        />
      </div>
    </div>
  );
}
