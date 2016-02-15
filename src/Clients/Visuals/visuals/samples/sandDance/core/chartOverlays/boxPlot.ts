//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    boxPlot - the BoxPlot overlay for an X-Band or Y-Band chart.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachParty
{
    export class BoxPlotClass
    {
        public static run(data: any[], xCol: string, yCol: string, whiskerType: WhiskerType)
        {
            var totalCount = data.length;
            var groups = data.groupBy(xCol);

            var boxData = groups.map(function (group: any, index: number)
            {
                var ydata = group.values.map(function (data, index) { return data[yCol]; });

                var sdata = ydata.orderByNum();
                var median = 0;
                var q1 = 0;
                var q3 = 0;

                var count = sdata.length;
                var index = Math.floor(count / 2);

                if (count > 1)
                {
                    //---- we are using "method 2" from this Quartile definition: http://en.wikipedia.org/wiki/Quartile ----
                    if (count % 2)
                    {
                        //---- count is ODD - use middle value ----
                        median = sdata[index];

                        var lowIndex = Math.floor(index / 2);
                        q1 = (sdata[lowIndex] + sdata[lowIndex + 1]) / 2;

                        var highIndex = index + lowIndex;
                        q3 = (sdata[highIndex] + sdata[highIndex + 1]) / 2;
                    }
                    else
                    {
                        //---- count is EVEN - must average 2 middle values ----
                        var before = sdata[index - 1];
                        var after = sdata[index];

                        median = (before + after) / 2;

                        var lowIndex = Math.floor(index / 2);
                        q1 = sdata[lowIndex];
                        q3 = sdata[index + lowIndex + 1];
                    }
                }
                else
                {
                    median = sdata[0];
                    q1 = median;
                    q3 = median;
                }

                var yMin = sdata[0];
                var yMax = sdata[count - 1];

                var iqr = q3 - q1;
                var lowFence, highFence;

                if (whiskerType == WhiskerType.minMax)
                {
                    //---- minMax ----
                    lowFence = yMin;
                    highFence = yMax;
                }
                else if (whiskerType == WhiskerType.tukey)
                {
                    //---- tukey ----
                    lowFence = Math.max(yMin, q1 - 1.5 * iqr);
                    highFence = Math.min(yMax, q3 + 1.5 * iqr);
                }
                else if (whiskerType == WhiskerType.percentiles9to91)
                {
                    //---- percentiles9to91 ----
                    lowFence = this.getPercentile(sdata, 9);
                    highFence = this.getPercentile(sdata, 91);
                }
                else if (whiskerType == WhiskerType.percentile2to98)
                {
                    //---- percentile2to98 ----
                    lowFence = this.getPercentile(sdata, 2);
                    highFence = this.getPercentile(sdata, 98);
                }
                else
                {
                    //---- stdDev ----
                    var stdDev = this.getStdDev(sdata);
                    var mean = sdata.sum() / sdata.length;

                    lowFence = mean - stdDev;
                    highFence = mean + stdDev;
                }

                var outliers = [];

                vp.utils.debug("vp.createBoxPlotData: sdata.length=" + sdata.length);

                //---- build list of outliers ----
                for (var s = 0; s < sdata.length; s++)
                {
                    //if (s % 300 === 0)
                    //{
                    //    vp.utils.debug("vp.createBoxPlotData: in loop with s=" + s);
                    //}

                    var value = sdata[s];
                    if (value < lowFence)
                    {
                        outliers.push(value);
                    }
                    else if (value > highFence)
                    {
                        outliers.push(value);
                    }
                }

                var result =
                    {
                        name: group.values[0][xCol], lower: q1, middle: median, upper: q3, yMin: yMin, yMax: yMax,
                        lowFence: lowFence, highFence: highFence, outliers: outliers
                    };

                vp.utils.debug("vp.createBoxPlotData: result.lower=" + result.lower);

                return result;
            });

            return boxData;
        }

        private static getPercentile(sdata, percentile)
        {
            var index = Math.round(percentile / 100 * (sdata.length - 1));
            var value = sdata[index];

            return value;
        }

        private static getStdDev(sdata)
        {
            var mean = sdata.sum() / sdata.length;

            var diffs = sdata.map(function (value, index)
            {
                var diffSq = (value - mean) * (value - mean);
                return diffSq;
            });

            var meanDiff = diffs.sum() / sdata.length;

            var stdDev = Math.sqrt(meanDiff);
            return stdDev;
        }

    }

    export enum WhiskerType
    {
        minMax,
        tukey,
        percentiles9to91,
        percentile2to98,
        stdDev,
    }
}

