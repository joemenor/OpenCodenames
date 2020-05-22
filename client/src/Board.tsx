import React from 'react';
import { Divider, Container, Grid, Segment, List, Icon, Message, Button, Loader, Form,} from 'semantic-ui-react';
import { chunk } from 'lodash';
import { AppColor, AppColorToCSSColor } from './config';
import useLocalStorage from './hooks/useLocalStorage';
import { toast } from 'react-toastify';

type BoardProps = {
  game: Game;
  appColor: AppColor;
  toaster: Toaster;
  sendMessage: (message: string) => void;
  setAppColor: (color: AppColor) => void;
};
type BannerMessageProps = {
  game: Game;
  sendMessage: (message: string) => void;
};
function BannerMessage({ game, sendMessage }: BannerMessageProps) {
  const { You } = game;
  const [restartingGame, setRestartingGame] = React.useState(false);
  const _BannerMessage = function (
    message: string,
    color: string,
    startNewGame: boolean,
    sendMessage: (message: string) => void,
  ) {
    return (
      <Message size="big"
      style={{backgroundColor: 'rgba(0, 0, 0, 0.25)',color:color}}
      >
        {message}
        {startNewGame && (
          <>
            <br />
            <Button
              style={{backgroundColor:AppColorToCSSColor[AppColor.Green]}}
              onClick={() => {
                setRestartingGame(true);
                sendMessage('RestartGame');
              }}
              disabled={!game.YouOwnGame || restartingGame}
              loading={restartingGame}
            >
              Play Again
            </Button>
          </>
        )}
      </Message>
    );
  };
  const {
    YourTurn,
    BaseGame: { Status, TeamRed, TeamBlue, WhoseTurn },
  } = game;
  if (Status === 'redwon') {
    return _BannerMessage(TeamRed.includes(You) ? 'You Won!' : 'The Red Guys Won The Game.', TeamRed.includes(You) ? AppColorToCSSColor[AppColor.Green].toString() : AppColorToCSSColor[AppColor.Red].toString(), true, sendMessage);
  } else if (Status === 'bluewon') {
    return _BannerMessage(TeamBlue.includes(You) ? 'You Won!' : 'The Blue Guys Won The Game.', TeamBlue.includes(You) ? AppColorToCSSColor[AppColor.Green].toString() : AppColorToCSSColor[AppColor.Red].toString(), true, sendMessage);
  }
  return _BannerMessage(
    YourTurn ? 'Your Turn' : WhoseTurn === 'red' ? "Red's Turn" : "Blue's Turn",
    YourTurn ? AppColorToCSSColor[AppColor.Green].toString() : WhoseTurn === 'red' ? AppColorToCSSColor[AppColor.Red].toString() : AppColorToCSSColor[AppColor.Red].toString(),
    false,
    sendMessage,
  );
}

function TeamDescription({
  icon,
  // color,
  teamColor,
  team,
  you,
  spy,
  guesser,
  yourTurn,
  endTurnLoading,
  setEndTurnLoading,
  sendMessage,
  clueWord,
  toaster,
}: {
  icon: 'spy' | 'spy';
  // color: 'red' | 'blue';
  teamColor: string,
  team: string[];
  you: string;
  spy: string;
  guesser: string;
  yourTurn: boolean;
  endTurnLoading: boolean;
  setEndTurnLoading: (isLoading: boolean) => void;
  sendMessage: (message: string) => void;
  clueWord:string;
  toaster: Toaster;
}) {
  
  const youAreGuesser = you === guesser;
  const youAreSpy = you === spy;
  
  React.useEffect(() => {
    if(clueWord && parseInt(clueWord.substr(-1),10)>0) {
      // let wordcount = parseInt(clueWord.substr(-1),10)
      const word = clueWord.split(",")[0].trim()
      const cards = parseInt(clueWord.split(",")[1].trim(),10)
      console.log(`${word} for: ${cards}`)
      toaster.green(`Clue: ${word.toLocaleUpperCase()} for ${cards}`)
    }
  }, [clueWord, toaster]);


  return (
    <>
      <Icon name={icon}
      size="big"
      // color={color}
      style={{color:teamColor,
      textShadow:'2px 2px #f5f5f5'
      // textShadow:'2px 2px 3px grey'
    }}
      />
      <List verticalAlign="middle">
        {team.sort().map((player) => (
          <b><List.Item key={player}>
            <List.Header style={{ color: player === you ? AppColorToCSSColor[AppColor.Green].toString() : 'black' ,
          textDecoration: player === you ? 'underline' : 'none'}}>
              {player}
              {player === spy ? ' (spy)' : player === guesser ? ' (guesser)' : ''}
            </List.Header>
          </List.Item></b>
        ))}
      </List>
      {yourTurn && youAreSpy && (
        <Form>
          <Form.Input
          label="ClueWord, #ofCards:"
          labelPosition="left"
          placeholder="Swim, 2..."
          // value={clueWord || ''}
          onChange={(e) => {
            if(e.target.value.length >0) {
              clueWord = e.target.value
              console.log(clueWord)
            }
          }}
          />
          {/* <Button type="submit">Submit</Button> */}
        </Form>
        )}
      {youAreGuesser && yourTurn && (
        <Button
          color="red"
          style={{backgroundColor: AppColorToCSSColor[AppColor.Red] }}
          // disabled={!yourTurn}
          onClick={() => {
            sendMessage('EndTurn');
            setEndTurnLoading(true);
          }}
          loading={endTurnLoading}
          negative
        >
          End Turn
        </Button>
      )}
    </>
  );
}
function Board({ game, sendMessage, appColor, setAppColor,toaster,
}: BoardProps) {
  const {
    You,
    YourTurn,
    BaseGame: {
      Cards,
      Status,
      TeamRed,
      TeamBlue,
      WhoseTurn,
      TeamBlueGuesser,
      TeamRedGuesser,
      LastCardGuessed,
      LastCardGuessedBy,
      LastCardGuessedCorrectly,
      TeamRedSpy,
      TeamBlueSpy,
      clueWord,
    },
  } = game;
  const [hasSeenTutorial, setHasSeenTutorialRerender, setHasSeenTutorialNoRerender] = useLocalStorage(
    'has-seen-tutorial',
    'true',
  );
  // const [clueWord, setClueWord] = React.useState<string | null>(null)
  // let clueWord = ''
  const gameIsRunning = Status === 'running';
  const playerIsOnTeamRed = TeamRed.includes(You);
  const playerIsOnTeamBlue = TeamBlue.includes(You);
  const isPlayersTurn = (playerIsOnTeamRed && WhoseTurn === 'red') || (playerIsOnTeamBlue && WhoseTurn === 'blue');
  const [loadingWord, setLoadingWord] = React.useState<string | null>(null);
  const [endTurnLoading, setEndTurnLoading] = React.useState<boolean>(false);
  React.useEffect(() => {
    if (hasSeenTutorial === 'false') {
      setHasSeenTutorialNoRerender('true');
    }
  }, [hasSeenTutorial, setHasSeenTutorialNoRerender]);
  if (endTurnLoading && !isPlayersTurn) {
    setEndTurnLoading(false);
  }
  React.useEffect(() => {
    setLoadingWord(null);
  }, [Cards]);
  React.useEffect(() => {
    if ((Status === 'redwon' && playerIsOnTeamRed) || (Status === 'bluewon' && playerIsOnTeamBlue)) {
      toaster.green('Hey! You Won!');
    } else if (['redwon', 'bluewon'].includes(Status)) {
      toaster.yellow('Welp! Ya Lost! 🤷‍♀️');
    }
  }, [Status, playerIsOnTeamRed, playerIsOnTeamBlue, toaster]);
  // React.useEffect(() => {
  //   if(clueWord && parseInt(clueWord.substr(-1),10)>0) {
  //     // let wordcount = parseInt(clueWord.substr(-1),10)
  //     const word = clueWord.split(",")[0].trim()
  //     const cards = parseInt(clueWord.split(",")[1].trim(),10)
  //     console.log(`${word} for: ${cards}`)
  //     toaster.green(`Clue: ${word.toLocaleUpperCase()} for ${cards}`)
  //   }
  // }, [clueWord, toaster]);
  React.useEffect(() => {
    if (playerIsOnTeamRed) {
      setAppColor(AppColor.Red);
    } else if (playerIsOnTeamBlue) {
      setAppColor(AppColor.Blue);
    }
  }, [playerIsOnTeamRed, playerIsOnTeamBlue, setAppColor]);
  // React.useEffect(() => {
  //   if (isPlayersTurn) {
  //     toaster.green("Your turn");
  //   } else if (WhoseTurn === 'blue') {
  //     toaster.blue("Blue team's turn");
  //   } else if (WhoseTurn === 'red') {
  //     toaster.red("Red team's turn");
  //   }
  // }, [WhoseTurn, isPlayersTurn, toaster]);
  React.useEffect(() => {
    if (LastCardGuessed !== '' && LastCardGuessedBy !== '') {
      if (LastCardGuessedCorrectly) {
        toaster.green(`${LastCardGuessedBy} got "${LastCardGuessed.toLocaleUpperCase()}" right.`);
      } else {
        toast.dismiss()
      toaster.yellow(`${LastCardGuessedBy} picked "${LastCardGuessed.toLocaleUpperCase()}." It was wrong.`);
      }
    }
  }, [LastCardGuessed, LastCardGuessedBy, LastCardGuessedCorrectly, toaster]);
  const gridRows = React.useMemo(() => {
    return chunk(
      Object.entries(Cards).sort((a, b) => {
        if (a[1].Index < b[1].Index) {
          return -1;
        } else if (a[1].Index > b[1].Index) {
          return 1;
        } else {
          return 0;
        }
      }),
      5,
    ).map((row, index) => {
      return (
        <Grid.Row key={index}>
          {row.map(([cardName, cardData]) => {
            return (
              <Grid.Column key={cardName} className="column-override">
                <Segment
                  className="game-segment"
                  textAlign="center"
                  style={{
                    userSelect: 'none',
                    ...((cardData.Guessed || !gameIsRunning) && { opacity: '.75' }),
                    backgroundColor: cardData.BelongsTo === 'red' ? AppColorToCSSColor[AppColor.Red] : cardData.BelongsTo === 'blue' ? AppColorToCSSColor[AppColor.Blue] : undefined,
                    // color: cardData.BelongsTo === 'red' ? 'white' : cardData.BelongsTo === 'blue' ? 'white' : undefined,
                  }}
                  // color={cardData.BelongsTo === 'red' ? 'red' : cardData.BelongsTo === 'blue' ? 'blue' : undefined}
                  inverted={['red', 'blue', 'black'].includes(cardData.BelongsTo)}
                  onClick={() => {
                    if (
                      [TeamBlueGuesser, TeamRedGuesser].includes(You) &&
                      YourTurn &&
                      loadingWord === null &&
                      !cardData.Guessed
                    ) {
                      sendMessage(`Guess ${cardName}`);
                      setLoadingWord(cardName);
                    }
                  }}
                  disabled={!gameIsRunning}
                >
                  <div>
                    {cardName === loadingWord ? (
                      <Loader active inline size="tiny" />
                    ) : cardData.Guessed ? (
                      <div className="card-guessed">{cardName.toLocaleUpperCase()}</div>
                    ) : (
                      cardName.toLocaleUpperCase()
                    )}
                  </div>
                </Segment>
              </Grid.Column>
            );
          })}
        </Grid.Row>
      );
    });
  }, [Cards, TeamBlueGuesser, TeamRedGuesser, You, YourTurn, sendMessage, gameIsRunning, loadingWord]);
  return (
    <Container textAlign="center">
      <BannerMessage game={game} sendMessage={sendMessage} />
      {hasSeenTutorial === 'false' && (
        <Message onDismiss={() => setHasSeenTutorialRerender('true')} floating info size="large">
          <Message.Header>How To Play</Message.Header>
          <p>
            After the Spy gives a clue the Guesser has to <b>click on a card</b> in order to guess.
            <br />
            <br />
            The card's color is shown, and if they were right, the Guesser can either{' '}
            <b>keep going</b> or <b>end the turn</b>.
            <br />
            <br />
            If the Guesser guesses incorrectly their turn will <b>automatically end</b>.
            <br />
            <br />
            Guesser has to click <b>End Turn</b> to stop guessing.
          </p>
        </Message>
      )}
      
      <Segment padded>
        <Grid columns={2} textAlign="center">
          <Grid.Row>
            <Divider vertical fitted as="span">
            </Divider>
            <Grid.Column padded="true">
              <TeamDescription
                icon="spy"
                // color="red"
                teamColor={AppColorToCSSColor[AppColor.Red]}
                team={TeamRed}
                you={You}
                spy={TeamRedSpy}
                guesser={TeamRedGuesser}
                yourTurn={YourTurn}
                sendMessage={sendMessage}
                endTurnLoading={endTurnLoading}
                setEndTurnLoading={setEndTurnLoading}
                clueWord={clueWord}
                toaster={toaster}
              />
            </Grid.Column>
            <Grid.Column>
              <TeamDescription
                icon="spy"
                // color="blue"
                teamColor={AppColorToCSSColor[AppColor.Blue]}
                team={TeamBlue}
                you={You}
                spy={TeamBlueSpy}
                guesser={TeamBlueGuesser}
                yourTurn={YourTurn}
                sendMessage={sendMessage}
                endTurnLoading={endTurnLoading}
                setEndTurnLoading={setEndTurnLoading}
                clueWord={clueWord}
                toaster={toaster}
              />
            </Grid.Column>
          </Grid.Row>
        </Grid>
      </Segment>
      <Grid columns={5} celled="internally" style={{ backgroundColor: AppColorToCSSColor[appColor] }}>
        {gridRows}
      </Grid>
    </Container>
  );
}

export default Board;
