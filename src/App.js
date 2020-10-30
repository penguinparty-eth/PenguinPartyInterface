import React from 'react';
import { HashRouter as Router, Switch, Route, NavLink, Redirect } from "react-router-dom";
import './App.css';
import Web3 from 'web3'
import Web3Modal from "web3modal";
import WalletConnectProvider from "@walletconnect/web3-provider";
import MewConnect from "@myetherwallet/mewconnect-web-client";
import Portis from "@portis/web3";
import { abi as uniABI } from './abi/uni.json';
import cachedDelegateList from './cache.json';
import apFactoryABI from './abi/apFactory.json';
import DelegateList from './components/DelegateList';
import AutonomousProposalList from './components/AutonomousProposalList';
import CodecksInfo from './components/CodecksInfo';
import AboutUs from './components/AboutUs.js';
require('dotenv').config();

class App extends React.Component {

    state = {
        delegates: [],
        autoProps: [],
        web3: {},
        navbar: {
            collapsed: false
        }
    }

    getDelegates = async () => {
        if(Object.keys(this.state.web3).length !== 0) {
            const uniAddress = process.env.REACT_APP_UNI_ADDRESS;
            let uni = new this.state.web3.eth.Contract(uniABI, uniAddress);

            //quickly get balances of cached delegate list before computing more accurate leaderboard
            let delegates = [];
            for(let i = 0; i < Math.min(50, cachedDelegateList.length); i++) {
                delegates.push({
                    delegate: cachedDelegateList[i],
                    votes: await uni.methods.getCurrentVotes(cachedDelegateList[i]).call() / 1e18
                });
            }
            delegates = delegates.sort((a, b) => {
                return a.votes < b.votes ? 1 : -1;
            });
            delegates = delegates.filter(a => {
                return a.votes !== 0;
            });
            this.setState({delegates: delegates});

            let delegations = [];
            let startingBlock = 10_750_000;
            if(process.env.REACT_APP_NETWORK === 'goerli') startingBlock = 10_000;
            for(let i = startingBlock; i < await this.state.web3.eth.getBlockNumber()+10_000; i+=10_000) {
                console.log('indexing delegates');
                console.log(i);
                try {
                    delegations.push(...await uni.getPastEvents('DelegateVotesChanged', {
                        fromBlock: (i-10_000),
                        toBlock: i
                    }));
                } catch {
                    delegations.push(...await uni.getPastEvents('DelegateVotesChanged', {
                        fromBlock: (i-10_000),
                        toBlock: i
                    }));
                }
            }
            const delegateAccounts = {};

            delegations.forEach(e => {
                const { delegate, newBalance } = e.returnValues;
                delegateAccounts[delegate] = newBalance;
            });

            delegates = [];
            Object.keys(delegateAccounts).forEach((account) => {
                const voteWeight = +delegateAccounts[account];
                if (voteWeight === 0) return;
                delegates.push({
                delegate: account,
                votes: voteWeight / 1e18
                });
            });

            delegates = delegates.sort((a, b) => {
                return a.votes < b.votes ? 1 : -1;
            });

            this.setState({delegates: delegates.slice(0, 100)});

            this.forceUpdate();
        }
    }

    getAutonomousProps = async () => {
        const apFactoryAddress = process.env.REACT_APP_AP_FACTORY_ADDRESS;
        console.log(apFactoryAddress);
        let apFactory = new this.state.web3.eth.Contract(apFactoryABI, apFactoryAddress);
        let autoProps = await apFactory.getPastEvents('CrowdProposalCreated', {
            fromBlock: 0,
            toBlock: await this.state.web3.eth.getBlockNumber()
        });
        this.setState({ autoProps: autoProps });
    }

    connect = async () => {
        console.log("connecting...");
        const providerOptions = {
            walletconnect: {
                package: WalletConnectProvider,
                options: {
                    infuraId: process.env.REACT_APP_INFURA_KEY
                }
            },
            mewconnect: {
                package: MewConnect,
                options: {
                    infuraId: process.env.REACT_APP_INFURA_KEY
                }
            },
            portis: {
                package: Portis,
                options: {
                    id: process.env.REACT_APP_PORTIS_KEY
                }
            }
        };

        const web3Modal = new Web3Modal({
            network: "mainnet",
            cacheProvider: false,
            disableInjectedProvider: false,
            providerOptions
        });

        web3Modal.clearCachedProvider()
        const provider = await web3Modal.connect();
        this.setState({web3: new Web3(provider)});

        await this.getAutonomousProps();
        await this.getDelegates();
    }

    connectRaw = async () => {
        console.log("connecting...");
        const providerOptions = {
            walletconnect: {
                package: WalletConnectProvider,
                options: {
                    infuraId: process.env.REACT_APP_INFURA_KEY
                }
            },
            mewconnect: {
                package: MewConnect,
                options: {
                    infuraId: process.env.REACT_APP_INFURA_KEY
                }
            },
            portis: {
                package: Portis,
                options: {
                    id: process.env.REACT_APP_PORTIS_KEY
                }
            }
        };

        const web3Modal = new Web3Modal({
            network: "mainnet",
            cacheProvider: false,
            disableInjectedProvider: false,
            providerOptions
        });

        web3Modal.clearCachedProvider()
        const provider = await web3Modal.connect();
        this.setState({web3: new Web3(provider)});
    }

    setupRaw = async () => {
        await this.getAutonomousProps();
        await this.getDelegates();
    }

    ConnectButton = () => {
        return (
            <button type="button" className="btn btn-primary" onClick={this.connect}>
                {Object.keys(this.state.web3) != 0 ? 'Connected' : 'Connect'}
            </button>
        )
    }

    toggleNavbar() {
        document.getElementById('uniswapGovernanceBtn').click();
    }
      
    render() {
        return (
            <div className="App">
                <Router>
                <div className="header">
                    <nav className="navbar fixed-top navbar-collapse navbar-dark header-navbar" style={{ display: (this.state.navbar.collapsed) ? 'show' : ''}}>
                        <div style={{ display: 'flex', alignItems: 'center', width: '20%' }}>
                            <button id="uniswapGovernanceBtn" className="navbar-toggler dropdown-menu-btn" type="button" data-toggle="collapse" data-target="#uniswapGovernance" aria-controls="navbarToggleExternalContent" aria-expanded="false" aria-label="Uniswap Governance | Menu">
                                <span className="navbar-toggler-icon"></span>
                            </button>
                            <h1 className="name-page">
                                <NavLink to='/ap' className="ap-nav element-nav no-hover" style={{ textDecoration: 'none'}}>
                                    Uniswap Governance
                                </NavLink>   
                            </h1>
                        </div>
                        <div className="app-menu">
                        <ul className="navbar-nav app-navbar-nav mr-auto mt-2 mt-lg-0">
                            <h5 className="nav-item active">
                                <NavLink to='/ap' className="ap-nav element-nav" style={{ textDecoration: 'none'}} activeStyle = {{ color: '#db2cc4', borderBottom: '2px solid #db2cc4'}}>
                                        Autonomous Proposals
                                </NavLink>
                            </h5>
                            <h5 className="nav-item">
                                <NavLink to='/del' className="delegate-nav element-nav"
                                style={{ textDecoration: 'none'}}
                                activeStyle = {{ color: '#db2cc4', borderBottom: '2px solid #db2cc4'}}>
                                        Delegates
                                </NavLink>
                            </h5>
                            <h5 className="nav-item">
                                <NavLink to='/co' className="codecks-nav element-nav"
                                style={{ textDecoration: 'none'}}
                                activeStyle = {{ color: '#db2cc4', borderBottom: '2px solid #db2cc4'}}>
                                        Codecks
                                </NavLink>
                            </h5>
                            <h5 className="nav-item">
                                <NavLink to='/aboutUs' className="aboutus-nav"
                                style={{ textDecoration: 'none'}}
                                activeStyle = {{ color: '#db2cc4', borderBottom: '2px solid #db2cc4'}}>
                                        About Us
                                </NavLink>
                            </h5>
                            </ul>
                        </div>
                        <div className="navbar-brand">
                            <NavLink to='/ap' className="ap-nav element-nav no-hover" style={{ textDecoration: 'none'}}>
                                <img src={"./logo.png"} width="50" height="50" className="d-inline-block align-top" alt="" loading="lazy"/>
                            </NavLink>
                        </div>
                        
                        <div className="collapse navbar-collapse" id="uniswapGovernance">
                            <ul className="navbar-nav mr-auto mt-2 mt-lg-0">
                            <li className="nav-item active">
                                <NavLink to='/ap' onClick={this.toggleNavbar.bind(this)}  className="ap-nav element-nav" style={{ textDecoration: 'none'}} activeStyle = {{ color: '#db2cc4', borderBottom: '2px solid #db2cc4'}}>
                                        Autonomous Proposals
                                </NavLink>
                            </li>
                            <li className="nav-item">
                                <NavLink to='/del' onClick={this.toggleNavbar.bind(this)} className="delegate-nav element-nav"
                                style={{ textDecoration: 'none'}}
                                activeStyle = {{ color: '#db2cc4', borderBottom: '2px solid #db2cc4'}}>
                                        Delegates
                                </NavLink>
                            </li>
                            <li className="nav-item">
                                <NavLink to='/co' onClick={this.toggleNavbar.bind(this)} className="codecks-nav element-nav"
                                style={{ textDecoration: 'none'}}
                                activeStyle = {{ color: '#db2cc4', borderBottom: '2px solid #db2cc4'}}>
                                        Codecks
                                </NavLink>
                            </li>
                            <li className="nav-item">
                                <NavLink to='/aboutUs' onClick={this.toggleNavbar.bind(this)} className="aboutus-nav"
                                style={{ textDecoration: 'none'}}
                                activeStyle = {{ color: '#db2cc4', borderBottom: '2px solid #db2cc4'}}>
                                        About Us
                                </NavLink>
                            </li>
                            </ul>
                        </div>
                    </nav>
                </div>
                    <div className="hero" />
                    <Switch>
                        <Route exact path='/'>
                            <Redirect to="/ap"></Redirect>
                        </Route>
                        <Route path='/del'>
                            <DelegateList delegates={this.state.delegates} web3={this.state.web3} connect={this.connect} />
                        </Route>
                        <Route path='/ap'>
                            <AutonomousProposalList autoProps={this.state.autoProps} web3={this.state.web3} connect={this.connect}></AutonomousProposalList>
                        </Route>
                        <Route path='/co'>
                            <CodecksInfo></CodecksInfo>
                        </Route>
                        <Route path='/aboutUs'>
                            <AboutUs web3={this.state.web3} connect={this.connectRaw} setup={this.setupRaw}></AboutUs>
                        </Route>
                    </Switch>
                </Router>
            </div>
        );
    }
}

export default App;
