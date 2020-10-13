import React from 'react';
import Plot from 'react-plotly.js';
import '../main.css';

class LineChart extends React.Component {
    render() {
            /** function that creates datetime month for a whole year */
            var arr = [];
            var i;
            for (i = 0; i < 12; i++) {
              var d = new Date();
              d.setMonth(d.getMonth()+i);
              var m = d.toISOString().split('T')[0];
              arr.push(m);
            };
            
            /** Calculates low, med, high estimates from given calculated values */
            var low_est = [];
            var med_est = [];
            var high_est = [];

            var low_tmp = 0;
            var med_tmp = 0;
            var high_tmp = 0;

            var low_monthly_credits = this.props.low_calc_results/12;
            var med_monthly_credits = this.props.med_calc_results/12;
            var high_monthly_credits = this.props.high_calc_results/12;

            for (i = 0; i < 12; i++) {
              low_est.push(low_monthly_credits+low_tmp)
              low_tmp += low_monthly_credits
              med_est.push(med_monthly_credits+med_tmp)
              med_tmp += med_monthly_credits
              high_est.push(high_monthly_credits+high_tmp)
              high_tmp += high_monthly_credits
        }

            return <Plot className="overlay_linechart"
            data={[
              {
                x: arr,
                y: low_est,
                type: 'scatter',
                name: 'Low Estimate',
                marker: {color: 'blue'},
              },
              {
                x: arr,
                y: med_est,
                type: 'scatter',
                name: 'Medium Estimate',
                marker: {color: 'green'},
              },
              {
                x: arr,
                y: high_est,
                type: 'scatter',
                marker: {color: 'red'},
                name: 'High Estimate',
              },
            ]}
            layout={ {title: 'Cumulative Credit Usage by Month'} }
          />
        ;
      }
    }

export default LineChart;