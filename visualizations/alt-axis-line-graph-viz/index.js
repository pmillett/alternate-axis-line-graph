import React from 'react';
import PropTypes from 'prop-types';
import {Card, CardBody, HeadingText, NrqlQuery, Spinner, AutoSizer, LineChart} from 'nr1';

export default class AltAxisLineGraph extends React.Component {
    // Custom props you wish to be configurable in the UI must also be defined in
    // the nr1.json file for the visualization. See docs for more details.
    static propTypes = {

        xAxis: PropTypes.string,
        yAxis: PropTypes.string,
        /**
         * An array of objects consisting of a nrql `query` and `accountId`.
         * This should be a standard prop for any NRQL based visualizations.
         */
        accountId: PropTypes.number,
        nrql: PropTypes.string,
};

    /**
     * Restructure the data for a non-time-series, facet-based NRQL query into a
     * form accepted by the Recharts library's RadarChart.
     * (https://recharts.org/api/RadarChart).
     */

    combineFacets = (sessionData) => {
        const {nrql, accountId, xAxis, yAxis } = this.props;
        
        var combinedFacetData = []
        
        for(var i = 0; i < sessionData.length; i++){

            var filteredData = {}
            if(combinedFacetData.length > 0) {
                if (sessionData[i].data[0].hasOwnProperty(xAxis)) {
                    filteredData = sessionData[i].data.filter(entry => entry[xAxis])
                    if(filteredData.length > 0) {
                        for(var j = 0; j < combinedFacetData.length; j++){
                            combinedFacetData[j][xAxis] = filteredData[j][xAxis];
                            combinedFacetData[j].y = combinedFacetData[j][yAxis];
                            combinedFacetData[j].x = combinedFacetData[j][xAxis];
                        }
                    }
                } else if(sessionData[i].data[0].hasOwnProperty(yAxis)) {
                    filteredData = sessionData[i].data.filter(entry => entry[yAxis])
                    if(filteredData.length > 0) {
                        for(var j = 0; j < combinedFacetData.length; j++){
                            combinedFacetData[j][yAxis] = filteredData[j][yAxis];
                            combinedFacetData[j].y = combinedFacetData[j][yAxis];
                            combinedFacetData[j].x = combinedFacetData[j][xAxis];
                        }
                    }
                }
            } else if(sessionData[i].data[0].hasOwnProperty(yAxis)){

                combinedFacetData = sessionData[i].data.filter(entry => entry[yAxis]);

            } else if(sessionData[i].data[0].hasOwnProperty(xAxis)) {
                
                combinedFacetData = sessionData[i].data.filter(entry => entry[xAxis]);

            }
            
        }

        return combinedFacetData;
        
    }

    transformData = (rawData) => {

        const uniqueSessionIds = [... new Set(rawData.map(data => data.metadata.groups[1].value))]
        var sessionData = []

        for(var i = 0; i < uniqueSessionIds.length; i++){
            sessionData.push(rawData.filter(data => data.metadata.groups[1].value == uniqueSessionIds[i]))
        }

        const combinedFacetData = sessionData.map(data => this.combineFacets(data))
        

        var metadata = []
        sessionData.forEach(session => {
            var tmpMetadata = session[0].metadata;
            tmpMetadata.name = session[0].metadata.groups[1].value
            tmpMetadata.units_data.x = "UNKOWN"
            tmpMetadata.tooltip = null
            metadata.push(tmpMetadata)
        })

        var transformedData = []

        for(i = 0; i < metadata.length; i++){
            transformedData.push({
                metadata: metadata[i],
                data: combinedFacetData[i]
            })
        }

        return transformedData;

    };

    /**
     * Format the given axis tick's numeric value into a string for display.
     */
    formatTick = (value) => {
        return value.toLocaleString();
    };

    render() {
        const {nrql, accountId, xAxis, yAxis } = this.props;

        const nrqlQueryPropsAvailable =
            nrql &&
            accountId &&
            xAxis &&
            yAxis;


        if (!nrqlQueryPropsAvailable) {
            return <EmptyState />;
        }

        if (!nrql.includes(xAxis)) {
            let error = "xAxis does not match query attribute";
            console.log(error)
            return <ErrorState msg={error}/>;
        } 

        if (!nrql.includes(yAxis)) {
            let error = "yAxis does not match query attribute";
            console.log(error)
            return <ErrorState msg={error}/>;
        } 

        if (!nrql.includes("FACET") && !nrql.includes("facet") && !nrql.includes("Facet") ) {
            let error = "NRQL query must include a FACET";
            console.log(error)
            return <ErrorState msg={error}/>;
        } 


        return (
            <AutoSizer>
                {({width, height}) => (
                        <NrqlQuery
                            query={nrql}
                            accountId={accountId}
                            pollInterval={NrqlQuery.AUTO_POLL_INTERVAL}>

                            {({data, loading, error}) => {
                                if (loading) {
                                    return <Spinner />;
                                }

                                if (error) {
                                    console.log(error);
                                    return <ErrorState />;
                                }

                                const transformedData = this.transformData(data);

                                return (
                                    <LineChart
                                        width={width}
                                        height={height}
                                        data={transformedData}
                                    />

                                );
                            }}
                        </NrqlQuery>
                )}
            </AutoSizer>
        );

    }
}

const EmptyState = () => (
    <Card className="EmptyState">
        <CardBody className="EmptyState-cardBody">
            <HeadingText
                spacingType={[HeadingText.SPACING_TYPE.LARGE]}
                type={HeadingText.TYPE.HEADING_3}
            >
                Please provide at least one NRQL query & account ID pair. Then input the attribute names of the attributes you wish to be the x and y axis
            </HeadingText>
            <HeadingText
                spacingType={[HeadingText.SPACING_TYPE.MEDIUM]}
                type={HeadingText.TYPE.HEADING_4}
            >
                An example NRQL query you can try is:
            </HeadingText>
            <code>
                FROM MobileRequest SELECT latest(memUsageMb), latest(timeSinceLoad) FACET sessionId TIMESERIES 
            </code>
        </CardBody>
    </Card>
);

const ErrorState = ({msg}) => (
    //console.log(msg)
    <Card className="ErrorState">
        <CardBody className="ErrorState-cardBody">
            <HeadingText
                className="ErrorState-headingText"
                spacingType={[HeadingText.SPACING_TYPE.LARGE]}
                type={HeadingText.TYPE.HEADING_3}
            >
                Oops! Something went wrong. <p>Error: {msg}</p>
            </HeadingText>
        </CardBody>
    </Card>
);
