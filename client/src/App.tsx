import React from 'react';
import './App.css';
import 'semantic-ui-css/semantic.min.css';
import 'react-toastify/dist/ReactToastify.min.css';
import { HashRouter as Router, Switch, Route } from 'react-router-dom';
import Home from './Home';
import Game from './Game';
import { AppColor, AppColorToCSSColor } from './config';
import { toast } from 'react-toastify';

toast.configure();
// const autoClose = 2000;
const autoClose = false;
const toaster: Toaster = {
  blue: (message: string) => toast(message, { autoClose, position: toast.POSITION.TOP_RIGHT, closeButton: false, className: 'toast-blue' }),
  red: (message: string) => toast(message, { autoClose, position: toast.POSITION.TOP_RIGHT, closeButton: false, className: 'toast-red'}),
  green: (message: string) => toast(message, { autoClose, position: toast.POSITION.TOP_RIGHT, closeButton: false, className: 'toast-green' }),
  yellow: (message: string) => toast(message, { autoClose, position: toast.POSITION.TOP_RIGHT, closeButton: false, className: 'toast-yellow' }),
};
function App() {
  const [appColor, setAppColor] = React.useState<AppColor>(AppColor.Grey);
  return (
    <Router>
      <div className="App" style={{ backgroundColor: AppColorToCSSColor[appColor] }}>
        <Switch>
          <Route path="/game">
            <Game appColor={appColor} setAppColor={(color: AppColor) => setAppColor(color)} toaster={toaster} />
          </Route>
          <Route path="/">
            <Home />
          </Route>
        </Switch>
        {/* <ToastContainer /> */}
      </div>
    </Router>
  );
}

export default App;
