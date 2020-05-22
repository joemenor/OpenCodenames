import React from 'react';
import {
  Container,
  Divider,
  Button,
  Form,
  Grid,
  Segment,
  Header,
  HeaderSubheader,
  Checkbox,
  Popup,
  Loader,
  Dimmer,
  Message,
} from 'semantic-ui-react';
import { useHistory } from 'react-router-dom';
import useAPI from './hooks/useAPI';
import useQuery from './hooks/useQuery';
import { AppColorToCSSColor, AppColor } from './config';

function Home() {
  const query = useQuery();
  const history = useHistory();
  const [gameIDFieldRequiredError, setGameIDFieldRequiredError] = React.useState(false);
  const [joinGamePlayerNameFieldRequiredError, setJoinGamePlayerNameFieldRequiredError] = React.useState(false);
  const [createGamePlayerNameFieldRequiredError, setCreateGamePlayerNameFieldRequiredError] = React.useState(false);
  const [playingOnThisDevice, setPlayingOnThisDevice] = React.useState(true);
  const [joinGameID, setJoinGameID] = React.useState<string | null>(query.get('gameID'));
  const [joinGamePlayerName, setJoinGamePlayerName] = React.useState<string | null>(null);
  const [createGamePlayerName, setCreateGamePlayerName] = React.useState<string | null>(null);
  const [shouldCreateGame, setShouldCreateGame] = React.useState(false);
  const [shouldJoinGame, setShouldJoinGame] = React.useState(false);
  const gameIDInParams = query.has('gameID');
  const [createGameLoading, createGameError, createGameResult] = useAPI({
    endpoint: `/game/create${playingOnThisDevice ? `?playerName=${createGamePlayerName}` : '?'}`,
    method: 'POST',
    skip: !shouldCreateGame || (playingOnThisDevice && (createGamePlayerName === null || createGamePlayerName === '')),
    withReCAPTCHA: false,
  });
  const [joinGameLoading, joinGameError, joinGameResult] = useAPI({
    endpoint: `/game/join?gameID=${joinGameID}&playerName=${joinGamePlayerName}`,
    method: 'POST',
    skip: !shouldJoinGame || joinGamePlayerName === null || joinGamePlayerName === '',
    withReCAPTCHA: false,
  });
  if (createGameResult?.id) {
    history.push(
      `/game?gameID=${createGameResult?.id}${
        !playingOnThisDevice ? '&spectate' : `&playerID=${createGameResult?.playerID}`
      }`,
    );
  } else if (createGameError) {
    return (
      <Container>
        <Message negative>
          <Message.Header>Something broke</Message.Header>
          <p>Try refreshing the page or asking Joe</p>
        </Message>
      </Container>
    );
  }
  if (joinGameResult?.success && joinGameResult?.playerID) {
    history.push(`/game?gameID=${joinGameID}&playerID=${joinGameResult?.playerID}`);
  } else if (joinGameError) {
    return (
      <Container>
        <Message negative>
          <Message.Header>Something broke</Message.Header>
          <p>Try refreshing the page or asking Joe</p>
        </Message>
      </Container>
    );
  }
  return (
    <>
      <Container textAlign="center">
        <Header as="h2" icon inverted>
          Codenames, Kinda?
          <HeaderSubheader>I think it pretty much works now.</HeaderSubheader>
        </Header>
      </Container>
      <Container textAlign="justified">
        <Divider />
        <Segment placeholder>
          <Grid columns={gameIDInParams ? 1 : 2} relaxed="very" stackable centered>
            <Grid.Column>
              <Form>
                <Form.Input
                  iconPosition="left"
                  label="Your code from Clara goes here:"
                  placeholder="5 Letter Code"
                  value={joinGameID || ''}
                  onChange={(e) => {
                    if (e.target.value.length > 0 && gameIDFieldRequiredError) {
                      setGameIDFieldRequiredError(false);
                    }
                    setJoinGameID(e.target.value.replace(/\s/g, '').slice(0, 16).toLocaleUpperCase());
                  }}
                  error={gameIDFieldRequiredError}
                />
                <Form.Input
                  iconPosition="left"
                  label="Your name:"
                  placeholder="Clara?"
                  value={joinGamePlayerName || ''}
                  onChange={(e) => {
                    if (e.target.value.length > 0 && joinGamePlayerNameFieldRequiredError) {
                      setJoinGamePlayerNameFieldRequiredError(false);
                    }
                    setJoinGamePlayerName(e.target.value.replace(/\s/g, '').slice(0, 16));
                  }}
                  error={joinGamePlayerNameFieldRequiredError}
                />
                <Button
                  content="Join game"
                  color="black"
                  style={{backgroundColor: AppColorToCSSColor[AppColor.Grey]}}
                  onClick={(_e) => {
                    const gameIDNotSet = joinGameID === null || joinGameID === '';
                    const playerNameNotSet = joinGamePlayerName === null || joinGamePlayerName === '';
                    if (gameIDNotSet) {
                      setGameIDFieldRequiredError(true);
                    }
                    if (playerNameNotSet) {
                      setJoinGamePlayerNameFieldRequiredError(true);
                    }
                    if (gameIDNotSet || playerNameNotSet) {
                      return;
                    }
                    setShouldJoinGame(true);
                  }}
                />
                <Dimmer active={joinGameLoading}>
                  <Loader size="large">Loading</Loader>
                </Dimmer>
              </Form>
            </Grid.Column>
            {!gameIDInParams && (
              <>
                <Divider vertical>Or</Divider>
                <Grid.Column verticalAlign="middle">
                  <Form>
                    <Form.Input
                      iconPosition="left"
                      label={<label style={{ textAlign: 'left' }}>Who Are You?</label>}
                      placeholder="Joe"
                      value={createGamePlayerName || ''}
                      onChange={(e) => {
                        if (e.target.value.length > 0 && createGamePlayerNameFieldRequiredError) {
                          setCreateGamePlayerNameFieldRequiredError(false);
                        }
                        setCreateGamePlayerName(e.target.value.replace(/\s/g, '').slice(0, 16));
                      }}
                      error={createGamePlayerNameFieldRequiredError}
                      disabled={!playingOnThisDevice}
                    />
                    <Popup
                      content="Disabling this will require you to join the game on a different device."
                      trigger={
                        <Checkbox
                          style={{ marginBottom: '15px' }}
                          label="I'm playing on this screen"
                          checked={playingOnThisDevice}
                          onChange={(_e) => {
                            setPlayingOnThisDevice(!playingOnThisDevice);
                          }}
                          toggle
                        />
                      }
                    />
                    <Button
                      content="New game"
                      size="medium"
                      color="black"
                      style={{backgroundColor: AppColorToCSSColor[AppColor.Grey]}}
                      onClick={() => {
                        if (playingOnThisDevice && (createGamePlayerName === null || createGamePlayerName === '')) {
                          setCreateGamePlayerNameFieldRequiredError(true);
                          return;
                        }
                        setShouldCreateGame(true);
                      }}
                    />
                    <Dimmer active={createGameLoading}>
                      <Loader size="large">Loading</Loader>
                    </Dimmer>
                    
                  </Form>
                </Grid.Column>
              </>
            )}
          </Grid>
        </Segment>
      </Container>
    </>
  );
}

export default Home;
