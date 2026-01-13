import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ColorRangeSlider.css';

const ColorRangeSlider = ({ color1, color2, onChange }) => {
    const min = 1;
    const max = 10;

    const [minVal, setMinVal] = useState(parseInt(color1) || 2);
    const [maxVal, setMaxVal] = useState(parseInt(color2) || 5);

    const minValRef = useRef(minVal);
    const maxValRef = useRef(maxVal);
    const rangeRef = useRef(null);

    const getPercent = useCallback(
        (value) => Math.round(((value - min) / (max - min)) * 100),
        []
    );

    // Update the range track when values change
    useEffect(() => {
        if (rangeRef.current) {
            const minPercent = getPercent(minVal);
            const maxPercent = getPercent(maxVal);
            rangeRef.current.style.left = `${minPercent}%`;
            rangeRef.current.style.width = `${maxPercent - minPercent}%`;
        }
    }, [minVal, maxVal, getPercent]);

    // Notify parent
    useEffect(() => {
        if (minVal !== minValRef.current || maxVal !== maxValRef.current) {
            minValRef.current = minVal;
            maxValRef.current = maxVal;
            onChange(minVal, maxVal);
        }
    }, [minVal, maxVal, onChange]);

    // Sync from props
    useEffect(() => {
        const c1 = parseInt(color1) || 2;
        const c2 = parseInt(color2) || 5;
        if (c1 !== minVal) setMinVal(c1);
        if (c2 !== maxVal) setMaxVal(c2);
    }, [color1, color2]);

    return (
        <div className="color-slider-wrapper">
            <div className="color-slider-label">COLOR RANGE</div>

            <div className="color-slider-container">
                {/* Tooltip for min value */}
                <div
                    className="color-slider-tooltip"
                    style={{ left: `${getPercent(minVal)}%` }}
                >
                    <span>{minVal}</span>
                    <div className="tooltip-arrow"></div>
                </div>

                {/* Tooltip for max value */}
                <div
                    className="color-slider-tooltip"
                    style={{ left: `${getPercent(maxVal)}%` }}
                >
                    <span>{maxVal}</span>
                    <div className="tooltip-arrow"></div>
                </div>

                {/* Slider Track */}
                <div className="color-slider-track">
                    <div className="color-slider-rail"></div>
                    <div ref={rangeRef} className="color-slider-range"></div>

                    {/* Min Handle */}
                    <div
                        className="color-slider-handle"
                        style={{ left: `${getPercent(minVal)}%` }}
                    ></div>

                    {/* Max Handle */}
                    <div
                        className="color-slider-handle"
                        style={{ left: `${getPercent(maxVal)}%` }}
                    ></div>
                </div>

                {/* Hidden range inputs for interaction */}
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={minVal}
                    onChange={(e) => {
                        const value = Math.min(Number(e.target.value), maxVal - 1);
                        setMinVal(value);
                    }}
                    className="color-slider-input color-slider-input--min"
                />
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={maxVal}
                    onChange={(e) => {
                        const value = Math.max(Number(e.target.value), minVal + 1);
                        setMaxVal(value);
                    }}
                    className="color-slider-input color-slider-input--max"
                />
            </div>
        </div>
    );
};

export default ColorRangeSlider;
