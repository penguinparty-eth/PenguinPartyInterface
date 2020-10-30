import React from 'react';
import {abi as uniABI} from '../abi/uni.json'

class AutonomousProposal extends React.Component {

    state = {
        votes: 0,
        rawVotes: 0,
        account: '',
        progressWidth: 0
    }

    getDescription = () => {
        if(Object.keys(this.props.autoProp) !== 0) {
            let title =  this.props.autoProp.returnValues.description.split(/\r?\n/)[0];
            title = title.replace('# ', '')
            if(title.length > 100) return title.slice(0, 100) + '...';
            return title;
        }
        return ''
    }
  
    getVotes = async () => {
        const uniAddress = process.env.REACT_APP_UNI_ADDRESS;
        let uni = new this.props.web3.eth.Contract(uniABI, uniAddress);
        let votes = (await uni.methods.getCurrentVotes(this.props.autoProp.returnValues.proposal).call() / 1e18).toFixed(0);
        this.setState({ rawVotes: votes });
        if(votes >= 1_000_000) {
            this.setState({ votes: (votes / 1_000_000).toFixed(2) + 'M' });
        } else if(votes >= 1_000) {
            this.setState({ votes: (votes / 1_000).toFixed(2) + 'K' });
        } else {
            this.setState({ votes: (votes/1).toFixed(0) });
        }
    }

    delegateTo = async () => {
        const uniAddress = process.env.REACT_APP_UNI_ADDRESS;
        let uni = new this.props.web3.eth.Contract(uniABI, uniAddress);
        await uni.methods.delegate(this.props.autoProp.returnValues.proposal).send({ from: this.state.account });
    }

    componentDidMount = async () => {
        
        // progress size
        const { clientWidth } = document.getElementById('progressBar');
        this.setState({ progressWidth: clientWidth });

        this.setState({ account: (await this.props.web3.eth.requestAccounts())[0]})
        await this.getVotes();
    }

    render() {
        return (
            <div className='AutonomousProposal'>
                <div className="delegate-info">
                    <div class="col-12 delegate-description">
                        {this.getDescription()}
                        <br />
                        <div style={{marginTop: '20px'}}>
                            {this.state.votes} / 10M UNI
                        </div>
                    </div>
                    <div class="progress" id="progressBar">
                        <div class="progress-bar" role="progressbar" style={{width: `${(this.state.progressWidth) * this.state.rawVotes / 10_000_000}px`}} aria-valuenow="50" aria-valuemin="0" aria-valuemax="100" />
                    </div>
                    <div class="col-12 delegate-button-container">
                        <button type="button" class="btn btn-primary" onClick={this.delegateTo}>Delegate</button>
                    </div>
                </div>
                
            </div>
        );
    }
}

export default AutonomousProposal;
