import React from 'react';
import { Container, Header, Divider, Card, Button, Segment, Select, Message } from 'semantic-ui-react';
import { AppColorToCSSColor, AppColor } from './config';

type LobbyProps = {
  game: Game;
  sendMessage: (message: string) => void;
};
const playerRoleOptions = [
  { key: 'bluespy', value: 'bluespy', text: 'Team Blue Spy' },
  { key: 'blueguesser', value: 'blueguesser', text: 'Team Blue Guesser' },
  { key: 'redspy', value: 'redspy', text: 'Team Red Spy' },
  { key: 'redguesser', value: 'redguesser', text: 'Team Red Guesser' },
  { key: 'blueobs', value: 'blueobs', text: 'Team Blue Observer' },
  { key: 'redobs', value: 'redobs', text: 'Team Red Observer' },
];
function Lobby({ game, sendMessage }: LobbyProps) {
  const [startGameLoading, setStartGameLoading] = React.useState<boolean>(false);
  const [updateTeamPlayer, setUpdateTeamPlayer] = React.useState<[string, string] | null>(null);
  const joinLink = `${window.origin}/#/?gameID=${game.BaseGame.ID}`;
  const watchLink = `${window.origin}/#/game?gameID=${game.BaseGame.ID}&spectate`;
  switch (updateTeamPlayer?.[1]) {
    case 'bluespy': {
      if (game.BaseGame.TeamBlueSpy === updateTeamPlayer?.[0]) {
        setUpdateTeamPlayer(null);
      }
      break;
    }
    case 'blueguesser': {
      if (game.BaseGame.TeamBlueGuesser === updateTeamPlayer?.[0]) {
        setUpdateTeamPlayer(null);
      }
      break;
    }
    case 'redspy': {
      if (game.BaseGame.TeamRedSpy === updateTeamPlayer?.[0]) {
        setUpdateTeamPlayer(null);
      }
      break;
    }
    case 'redguesser': {
      if (game.BaseGame.TeamRedGuesser === updateTeamPlayer?.[0]) {
        setUpdateTeamPlayer(null);
      }
      break;
    }
    case 'blueobs': {
      if (game.BaseGame.TeamBlue.includes(updateTeamPlayer?.[0])) {
        setUpdateTeamPlayer(null);
      }
      break;
    }
    case 'redobs': {
      if (game.BaseGame.TeamRed.includes(updateTeamPlayer?.[0])) {
        setUpdateTeamPlayer(null);
      }
      break;
    }
  }
  const allRolesFilled =
    game.BaseGame.TeamBlueSpy &&
    game.BaseGame.TeamBlueGuesser &&
    game.BaseGame.TeamRedSpy &&
    game.BaseGame.TeamRedGuesser;
  return (
    <>
      <Container textAlign="center">
        <Header as="h2" icon inverted>
          The Code Is: {game.BaseGame.ID}
        </Header>
      </Container>
      <Container textAlign="center" text>
        <div>
          <Segment attached 
          // color="green"
          >
            Invite:
            <br />
            <small>
              <a href={joinLink} target="_blank" rel="noopener noreferrer">
                {joinLink}
              </a>
            </small>
          </Segment>
          <Segment attached>
            Link To Just Watch:
            <br />
            <small>
              <a href={watchLink} target="_blank" rel="noopener noreferrer">
                {watchLink}
              </a>
            </small>
          </Segment>
          {game.YouOwnGame && (
            <Segment attached>
              <Button
                onClick={() => {
                  sendMessage('StartGame');
                  setStartGameLoading(true);
                }}
                color="green"
                style={{backgroundColor:AppColorToCSSColor[AppColor.Green]}}
                disabled={!game.GameCanStart || updateTeamPlayer !== null || !allRolesFilled || startGameLoading}
                loading={startGameLoading}
              >
                Start game
              </Button>
            </Segment>
          )}
          {!allRolesFilled && (
            <Message color="yellow">
              <Message.Header>Waitin</Message.Header>
              <p>Need a Spy & a Guesser on both teams</p>
            </Message>
          )}
        </div>
      </Container>
      <Container textAlign="justified">
        <Divider />
        <Card.Group centered>
          {game.BaseGame.Players.sort().map((playerName) => (
            <Card color={game.BaseGame.TeamBlue.includes(playerName) ? 'blue' : 'red'} key={playerName}
            style={{backgroundColor:game.BaseGame.TeamBlue.includes(playerName) ? AppColorToCSSColor[AppColor.Blue] : AppColorToCSSColor[AppColor.Red], boxShadow:'none'}}
            >
              <Card.Content>
                <Card.Description textAlign="center">
                  <Header as="h2" icon>
                    {playerName}
                  </Header>
                </Card.Description>
                <Select
                  options={playerRoleOptions}
                  style={{ display: 'block' }}
                  value={
                    playerName === updateTeamPlayer?.[0]
                      ? updateTeamPlayer?.[1]
                      : game.BaseGame.TeamBlueSpy === playerName
                      ? 'bluespy'
                      : game.BaseGame.TeamBlueGuesser === playerName
                      ? 'blueguesser'
                      : game.BaseGame.TeamRedSpy === playerName
                      ? 'redspy'
                      : game.BaseGame.TeamRedGuesser === playerName
                      ? 'redguesser'
                      : game.BaseGame.TeamBlue.includes(playerName)
                      ? 'blueobs'
                      : 'redobs'
                  }
                  disabled={updateTeamPlayer !== null || !game.YouOwnGame}
                  loading={playerName === updateTeamPlayer?.[0]}
                  onChange={(_, data) => {
                    setUpdateTeamPlayer([playerName, String(data.value)]);
                    sendMessage(`UpdateTeam ${playerName} ${data.value}`);
                  }}
                />
              </Card.Content>
            </Card>
          ))}
        </Card.Group>
      </Container>
    </>
  );
}

export default Lobby;
