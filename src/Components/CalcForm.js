import React, {Component} from 'react';
import { Button, Form, Container} from "react-bootstrap";
import CalcResults from './CalcResults.js';
import '../main.css'


class CalcForm extends Component {
  

  constructor(props) {
    super(props);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleModalClose = this.handleModalClose.bind(this);
    this.handleModalOpen = this.handleModalOpen.bind(this);

    /** Intializing props for form component */
    this.state = {
      validated: false,
      low_calc_results: null,
      med_calc_results: null,
      high_calc_results: null,
      data_size: 5000,
      data_growth_rate: 100,
      ingestion_frequency: 'Every Day',
      bi_dashboards: 25,
      transformation_complexity: 'Low',
      transformation_frequency: 'Every Day',
      credit_cost: null,
      showModal: false
    };
  }

  handleModalOpen() {
    this.setState({
      showModal: true
    })
  }

  handleModalClose() {
    this.setState({
      showModal: false
    })
  }

  /** Returns the number of times something occurs with a given string frequency.
   * 
   * @param string freq - the frequency selection to convert
   */
  getAnnualOccurences(freq) {
    const annual_occurences = 
      freq === "Every Minute" ? 60 * 24 * 365 :
      freq === "Every Hour" ? 24 * 365 :
      freq === "Every Day" ? 365 :
      freq === "Every Week" ? 52 :
      null;
    
    return annual_occurences;
  }

  /** handles form field inputs */
  handleInputChange(event) {
    this.setState({
      [event.target.name]: event.target.type === 'number' ? parseInt(event.target.value) : event.target.value
    });
  }

  /** Handles form submission */
  handleSubmit = (event) => {
    event.preventDefault();

    // Check validity of form 
    const form = event.currentTarget;
    if (form.checkValidity() === false) {
      event.stopPropagation();
    }

    //============================================ 
    // starting credit calculation
    //============================================ 

    // calculate ingestion usage
    const annual_ingestions = this.getAnnualOccurences(this.state.ingestion_frequency);
    const total_data_to_ingest = this.state.data_size + this.state.data_growth_rate * 12; //todo: break up initial load from steady-state load
    const data_to_ingest_per_ingestion = total_data_to_ingest / annual_ingestions;
    const credits_used_per_ingestion = Math.max(
      1/60, // minimum possible number of credits usable in snowflake
      data_to_ingest_per_ingestion / 1024 * 32 / 15.4 
    );  // formula from this blog post for compressed csv's https://www.snowflake.com/blog/how-to-load-terabytes-into-snowflake-speeds-feeds-and-techniques/#:~:text=While%205%2D6%20TB%2Fhour,landing%20it%20into%20a%20VARIANT.

    // calculate transformation usage
    const annual_transformations = this.getAnnualOccurences(this.state.ingestion_frequency);
    const transformation_complexity_factor = 
      this.state.transformation_complexity === "High" ? 2 : 
      this.state.transformation_complexity === "Medium" ? 1 : 
      this.state.transformation_complexity === "Low" ? 0.5 : 
      null;
    const data_processed_per_transformation = total_data_to_ingest / annual_transformations;
    const credits_used_per_transformation = this.state.bi_dashboards === 0 ? 0 : Math.max( // if there are no dashboards, assume no transformation
      1/60, // minimum possible number of credits usable in snowflake
      data_processed_per_transformation / 1024 * 32 / 15.4 * Math.log10(this.state.bi_dashboards) * transformation_complexity_factor
    );

    // calculate consumption usage
    const annual_consumptions = Math.max(365, annual_transformations) * this.state.bi_dashboards;
    // TODO: find a better way to do this. Currently assuming BI tables are properly designed for rapid consumption and that credit usage growths lograthmically with the amount of "recent" data. 
    const credits_used_per_consumption = this.state.bi_dashboards === 0 ? 0 : 1/60 * Math.log2(this.state.data_growth_rate); // if there are no dashboards, assume no consumption

    // calculate components of annual usage
    const ingestion_usage      = annual_ingestions * credits_used_per_ingestion;
    const transformation_usage = annual_transformations * credits_used_per_transformation;
    const consumption_usage    = annual_consumptions * credits_used_per_consumption;

    // calculate annual usage
    const annual_usage = ingestion_usage + transformation_usage + consumption_usage;
    //============================================ 

    this.setState({
      low_calc_results:  0.5 * annual_usage,
      med_calc_results:  1.0 * annual_usage,
      high_calc_results: 1.5 * annual_usage,
    });

    this.setState({validated:true});

    this.handleModalOpen();
  }
    

  render() {
    let {low_calc_results, med_calc_results, high_calc_results, validated} = this.state;

    /** renders form */
    return (
      <Container fluid>
        <div className="row">
          <div className="pt-5 col-8 col-xs-12 mx-auto">
            <h4 className="mb-3 text-center bold">Anticipated Snowflake Usage Details:</h4>
            <div className='full_page'>
              <Form id='estimator-form' className="needs-validation" noValidate validated={validated} onSubmit={this.handleSubmit}>
                    <Form.Group md="4" controlId="data_size">
                      <Form.Label>Total data size before Snowflake compression<span className="text-muted"> (in gigabytes)</span></Form.Label>
                      <Form.Control
                        onChange={this.handleInputChange}
                        required
                        type="number"
                        placeholder={this.state.data_size + ' Gigabytes'}
                        name="data_size"
                      />
                      <Form.Control.Feedback type="invalid">Please enter your anticipated data size.</Form.Control.Feedback>
                    </Form.Group>
                    <Form.Group md="4" controlId="data_growth_rate">
                      <Form.Label>Data growth rate<span className="text-muted"> (how much does data size increase every month in gigabytes)</span></Form.Label>
                      <Form.Control
                        onChange={this.handleInputChange}
                        required
                        type="number"
                        placeholder={this.state.data_growth_rate + ' Gigabytes / month'}
                        name="data_growth_rate"
                      />
                      <Form.Control.Feedback type="invalid">Please enter your expected monthly data growth in gigabytes.</Form.Control.Feedback>
                    </Form.Group>
                    <Form.Group md="4" controlId="ingestion_frequency">
                      <Form.Label>Data ingestion frequency<span className="text-muted"> (on average, how often do you plan to ingest data)</span></Form.Label>
                      <Form.Control as="select" name="ingestion_frequency" required onChange={this.handleInputChange} custom 
                        defaultValue={this.state.ingestion_frequency}>
                        <option>Every Minute</option>
                        <option>Every Hour</option>
                        <option>Every Day</option>
                        <option>Every Week</option>
                      </Form.Control>
                    </Form.Group>
                    <Form.Group md="4" controlId="bi_dashboards">
                      <Form.Label>Number of BI dashboards<span className="text-muted"> (10 for small, 100 for medium, and 1000 for large organizations if you're not sure)</span></Form.Label>
                      <Form.Control
                        onChange={this.handleInputChange}
                        required
                        type="number"
                        placeholder={this.state.bi_dashboards + ' Dashboards'}
                        name="bi_dashboards"
                      />
                      <Form.Control.Feedback type="invalid">Please enter your expected number of BI dashboards.</Form.Control.Feedback>
                    </Form.Group>
                    <Form.Group md="4" controlId="transformation_complexity">
                      <Form.Label>Typical transformation complexity <span className="text-muted"> (on average)</span></Form.Label>
                      <Form.Control as="select" name="transformation_complexity" required onChange={this.handleInputChange} custom
                        defaultValue={this.state.transformation_complexity}>
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                      </Form.Control>
                    </Form.Group>
                    <Form.Group md="4" controlId="transformation_frequency">
                      <Form.Label>Data transformation frequency<span className="text-muted"> (on average, how often do you plan to process data)</span></Form.Label>
                      <Form.Control as="select" name="transformation_frequency" required onChange={this.handleInputChange} custom
                        defaultValue={this.state.transformation_frequency}>
                        <option>Every Minute</option>
                        <option>Every Hour</option>
                        <option>Every Day</option>
                        <option>Every Week</option>
                      </Form.Control>
                    </Form.Group>
                    <Form.Group md="4" controlId="credit_cost">
                      <Form.Label>Cost per Snowflake Credit<span className="text-muted"> (optional)</span></Form.Label>
                      <Form.Control
                        onChange={this.handleInputChange}
                        type="number"
                        placeholder={'$3'}
                        name="credit_cost"
                      />
                      <Form.Control.Feedback type="invalid">Please enter your expected number of BI dashboards.</Form.Control.Feedback>
                    </Form.Group>
                  <Button variant="btn btn-primary btn-lg btn-block" type="submit" id="submit_button">Estimate Credits</Button>
                </Form>
            </div>
          </div>

          <div className="text-left">
            <p>Snowflake Estimator is designed to provide high-level estimates of Snowflake usage for those considering migration to a Modern Cloud Data Warehouse. </p>
            <p>This tool is not a replacement for a proper assessment! Please use it as a rough order of magnitude estimate for your credit consumption in Snowflake.</p>
            <p><a class='link' href='https://www.hashmapinc.com/snowflakeestimator-reachout'>If you're interested in a more formal exercise, please reach out!</a></p>
            <CalcResults
            showModal={this.state.showModal}
            handleModalClose={this.handleModalClose}
            handleModalOpen={this.handleModalOpen}
            low_calc_results={low_calc_results}
            med_calc_results={med_calc_results}
            high_calc_results={high_calc_results}
            credit_cost={this.state.credit_cost}
            >

            </CalcResults>
          </div>
        </div>
      </Container>
    )
  }
}


export default CalcForm