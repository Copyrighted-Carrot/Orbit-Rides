'use client';

import React, { useState } from "react";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export type CustomDatePickerProps = {
    name?: string;
    id?: string;
    form?: string;
    className?: string;
    onDateRangeChange?: (dates: [Date | null, Date | null]) => void;
    [key: string]: unknown;
};

export default function DatePicker(props: CustomDatePickerProps) {
    const { onDateRangeChange, ...restProps } = props;

    const after1Day = new Date();
    after1Day.setDate(after1Day.getDate() + 1);
    const [startDate, setStartDate] = useState<Date | undefined>(after1Day);

    const after3Days = new Date();
    after3Days.setDate(after3Days.getDate() + 3);
    const [endDate, setEndDate] = useState<Date | undefined>(after3Days);

    const onChange = (dates: [Date | null, Date | null]) => {
        const [start, end] = dates;
        setStartDate(start ?? undefined);
        setEndDate(end ?? undefined);
        if (onDateRangeChange) {
            onDateRangeChange(dates);
        }
    };

    return (
        <ReactDatePicker
            {...restProps}
            required
            enableTabLoop={false}
            portalId={'react-datepicker-portal'}
            selectsRange
            selected={startDate}
            onChange={onChange}
            onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
                e.target.readOnly = true;
            }}
            minDate={new Date()}
            startDate={startDate}
            endDate={endDate}
        />
    );
}
