export type TriviaQuestion = {
  id: string;
  category: string;
  difficulty: "Local" | "Express";
  question: string;
  options: string[];
  answer: string;
  fact: string;
};

type TriviaFact = Omit<TriviaQuestion, "id" | "question"> & {
  subject: string;
  clue: string;
};

const facts: TriviaFact[] = [
  { category: "Garden", difficulty: "Local", subject: "Knicks home arena", clue: "Which arena is home to the New York Knicks?", options: ["Madison Square Garden", "Barclays Center", "Yankee Stadium", "Radio City Music Hall"], answer: "Madison Square Garden", fact: "The Knicks play above Penn Station at Madison Square Garden." },
  { category: "Origins", difficulty: "Local", subject: "team founding year", clue: "In what year were the New York Knicks founded?", options: ["1946", "1954", "1961", "1970"], answer: "1946", fact: "The Knicks were founded in 1946 as a charter member of the BAA." },
  { category: "Origins", difficulty: "Local", subject: "Knickerbockers nickname", clue: "The name “Knickerbockers” historically refers to what?", options: ["Dutch settlers of New York", "Subway conductors", "Broadway performers", "Harlem musicians"], answer: "Dutch settlers of New York", fact: "Knickerbockers became a nickname for New Yorkers with Dutch roots." },
  { category: "Championships", difficulty: "Local", subject: "first Knicks championship", clue: "When did the Knicks win their first NBA championship?", options: ["1970", "1967", "1973", "1977"], answer: "1970", fact: "New York defeated the Lakers for the 1970 title." },
  { category: "Championships", difficulty: "Local", subject: "second Knicks championship", clue: "When did the Knicks win their second NBA championship?", options: ["1973", "1970", "1976", "1980"], answer: "1973", fact: "The Knicks beat the Lakers again to claim the 1973 championship." },
  { category: "Legends", difficulty: "Local", subject: "Willis Reed", clue: "Which injured Knicks captain famously emerged from the tunnel before Game 7 of the 1970 Finals?", options: ["Willis Reed", "Walt Frazier", "Dave DeBusschere", "Bill Bradley"], answer: "Willis Reed", fact: "Willis Reed’s tunnel entrance is one of the Garden’s defining moments." },
  { category: "Legends", difficulty: "Local", subject: "Clyde Frazier", clue: "Which Knicks legend is nicknamed “Clyde”?", options: ["Walt Frazier", "Earl Monroe", "Willis Reed", "Dick Barnett"], answer: "Walt Frazier", fact: "Walt “Clyde” Frazier starred at guard and later became a beloved broadcaster." },
  { category: "Legends", difficulty: "Express", subject: "1970 Game 7", clue: "Who scored 36 points and added 19 assists in Game 7 of the 1970 NBA Finals?", options: ["Walt Frazier", "Willis Reed", "Jerry West", "Bill Bradley"], answer: "Walt Frazier", fact: "Frazier produced 36 points and 19 assists in the title-clinching win." },
  { category: "Legends", difficulty: "Local", subject: "Pearl Monroe", clue: "Which Knicks Hall of Famer was known as “Earl the Pearl”?", options: ["Earl Monroe", "Dick Barnett", "Richie Guerin", "Allan Houston"], answer: "Earl Monroe", fact: "Earl Monroe joined the Knicks in 1971 and won the 1973 title." },
  { category: "Legends", difficulty: "Local", subject: "Dollar Bill Bradley", clue: "Which championship-era Knick was nicknamed “Dollar Bill”?", options: ["Bill Bradley", "Phil Jackson", "Dave DeBusschere", "Jerry Lucas"], answer: "Bill Bradley", fact: "Bill Bradley won two titles with New York before entering politics." },
  { category: "Legends", difficulty: "Local", subject: "Patrick Ewing", clue: "Which center was selected first overall by the Knicks in 1985?", options: ["Patrick Ewing", "Charles Oakley", "Bill Cartwright", "Marcus Camby"], answer: "Patrick Ewing", fact: "Patrick Ewing became the face of the franchise after the 1985 draft." },
  { category: "Legends", difficulty: "Express", subject: "Ewing college", clue: "Where did Patrick Ewing play college basketball?", options: ["Georgetown", "Syracuse", "St. John’s", "North Carolina"], answer: "Georgetown", fact: "Ewing starred at Georgetown and won the 1984 NCAA championship." },
  { category: "Playoffs", difficulty: "Local", subject: "1994 Finals opponent", clue: "Which team faced the Knicks in the 1994 NBA Finals?", options: ["Houston Rockets", "Chicago Bulls", "Indiana Pacers", "San Antonio Spurs"], answer: "Houston Rockets", fact: "Houston defeated New York in a seven-game 1994 Finals." },
  { category: "Playoffs", difficulty: "Local", subject: "1999 Finals opponent", clue: "Which team faced the Knicks in the 1999 NBA Finals?", options: ["San Antonio Spurs", "Utah Jazz", "Los Angeles Lakers", "Portland Trail Blazers"], answer: "San Antonio Spurs", fact: "San Antonio beat New York in the 1999 NBA Finals." },
  { category: "Playoffs", difficulty: "Express", subject: "1999 seed", clue: "What seed were the Knicks when they reached the 1999 NBA Finals?", options: ["Eighth", "Sixth", "Fourth", "Second"], answer: "Eighth", fact: "The 1999 Knicks became the first eighth seed to reach the NBA Finals." },
  { category: "Playoffs", difficulty: "Local", subject: "Houston series winner", clue: "Who hit the series-winning shot against Miami in Game 5 of the 1999 first round?", options: ["Allan Houston", "Latrell Sprewell", "Larry Johnson", "Patrick Ewing"], answer: "Allan Houston", fact: "Allan Houston’s runner bounced in with eight-tenths of a second left." },
  { category: "Playoffs", difficulty: "Local", subject: "four-point play", clue: "Which Knick made the famous four-point play against Indiana in the 1999 playoffs?", options: ["Larry Johnson", "Allan Houston", "Latrell Sprewell", "Charlie Ward"], answer: "Larry Johnson", fact: "Larry Johnson’s four-point play helped swing Game 3 of the East finals." },
  { category: "Rivalries", difficulty: "Local", subject: "Reggie Miller rivalry", clue: "Which Pacers star became a major Knicks playoff rival in the 1990s?", options: ["Reggie Miller", "Mark Price", "Clyde Drexler", "Gary Payton"], answer: "Reggie Miller", fact: "Reggie Miller and the Pacers repeatedly battled New York in the playoffs." },
  { category: "Rivalries", difficulty: "Local", subject: "Jordan rivalry", clue: "Which superstar’s Bulls frequently ended Knicks playoff runs in the 1990s?", options: ["Michael Jordan", "Magic Johnson", "Larry Bird", "Hakeem Olajuwon"], answer: "Michael Jordan", fact: "Jordan’s Bulls eliminated New York five times between 1989 and 1996." },
  { category: "Coaches", difficulty: "Local", subject: "Pat Riley", clue: "Who coached the Knicks from 1991 through 1995?", options: ["Pat Riley", "Jeff Van Gundy", "Don Nelson", "Rick Pitino"], answer: "Pat Riley", fact: "Pat Riley’s Knicks were known for defense and physical play." },
  { category: "Coaches", difficulty: "Local", subject: "1999 Finals coach", clue: "Who coached the Knicks to the 1999 NBA Finals?", options: ["Jeff Van Gundy", "Pat Riley", "Don Chaney", "Mike D’Antoni"], answer: "Jeff Van Gundy", fact: "Jeff Van Gundy led the eighth-seeded Knicks to the 1999 Finals." },
  { category: "Coaches", difficulty: "Express", subject: "Red Holzman", clue: "Who coached both Knicks championship teams?", options: ["Red Holzman", "Pat Riley", "Joe Lapchick", "Hubie Brown"], answer: "Red Holzman", fact: "Red Holzman coached New York to the 1970 and 1973 titles." },
  { category: "Numbers", difficulty: "Local", subject: "Ewing jersey", clue: "What number did Patrick Ewing wear for the Knicks?", options: ["33", "32", "34", "30"], answer: "33", fact: "Patrick Ewing’s number 33 hangs in the Garden rafters." },
  { category: "Numbers", difficulty: "Local", subject: "Frazier jersey", clue: "What number did Walt Frazier wear for the Knicks?", options: ["10", "12", "15", "22"], answer: "10", fact: "Walt Frazier’s number 10 was retired by the Knicks." },
  { category: "Numbers", difficulty: "Local", subject: "Reed jersey", clue: "What number did Willis Reed wear for the Knicks?", options: ["19", "15", "22", "24"], answer: "19", fact: "Willis Reed’s number 19 was the first number retired by the Knicks." },
  { category: "Numbers", difficulty: "Express", subject: "Monroe jersey", clue: "What number did Earl Monroe wear with the Knicks?", options: ["15", "10", "19", "24"], answer: "15", fact: "Earl Monroe’s number 15 was retired by New York." },
  { category: "Numbers", difficulty: "Express", subject: "DeBusschere jersey", clue: "What number did Dave DeBusschere wear for the Knicks?", options: ["22", "12", "24", "32"], answer: "22", fact: "Dave DeBusschere’s number 22 hangs in the Garden rafters." },
  { category: "Modern Era", difficulty: "Local", subject: "Linsanity", clue: "What nickname described Jeremy Lin’s explosive 2012 Knicks run?", options: ["Linsanity", "Lincredible Run", "Broadway Lin", "The Garden Flash"], answer: "Linsanity", fact: "Jeremy Lin’s February 2012 breakout became known worldwide as Linsanity." },
  { category: "Modern Era", difficulty: "Local", subject: "Melo 62", clue: "Who scored a Knicks-record 62 points at Madison Square Garden in 2014?", options: ["Carmelo Anthony", "Amar’e Stoudemire", "J.R. Smith", "Jalen Brunson"], answer: "Carmelo Anthony", fact: "Carmelo Anthony scored 62 against Charlotte on January 24, 2014." },
  { category: "Modern Era", difficulty: "Local", subject: "Brunson college", clue: "Where did Jalen Brunson play college basketball?", options: ["Villanova", "Duke", "Kentucky", "UConn"], answer: "Villanova", fact: "Brunson won two national championships at Villanova." },
  { category: "Modern Era", difficulty: "Local", subject: "Brunson father", clue: "Which former Knick is Jalen Brunson’s father?", options: ["Rick Brunson", "Greg Anthony", "Derek Harper", "Mark Jackson"], answer: "Rick Brunson", fact: "Rick Brunson played for the Knicks and later joined their coaching staff." },
  { category: "Modern Era", difficulty: "Local", subject: "Josh Hart college", clue: "Where did Josh Hart play college basketball?", options: ["Villanova", "Georgetown", "Seton Hall", "Michigan State"], answer: "Villanova", fact: "Josh Hart was a Villanova teammate of Jalen Brunson." },
  { category: "Modern Era", difficulty: "Local", subject: "Knicks colors", clue: "Which colors are most associated with the Knicks?", options: ["Blue and orange", "Black and gold", "Green and white", "Red and navy"], answer: "Blue and orange", fact: "Blue and orange also appear on New York City’s flag." },
  { category: "New York", difficulty: "Local", subject: "Penn Station", clue: "Which major transit hub sits directly beneath Madison Square Garden?", options: ["Penn Station", "Grand Central Terminal", "Atlantic Terminal", "Port Authority"], answer: "Penn Station", fact: "Madison Square Garden is built above New York Penn Station." },
  { category: "New York", difficulty: "Local", subject: "Garden borough", clue: "In which borough is Madison Square Garden located?", options: ["Manhattan", "Brooklyn", "Queens", "The Bronx"], answer: "Manhattan", fact: "The Garden sits in Midtown Manhattan." },
  { category: "New York", difficulty: "Local", subject: "Garden avenue", clue: "Madison Square Garden sits along which avenue?", options: ["Seventh Avenue", "Fifth Avenue", "Madison Avenue", "Lexington Avenue"], answer: "Seventh Avenue", fact: "The current Garden occupies the blocks between Seventh and Eighth Avenues." },
  { category: "Garden", difficulty: "Express", subject: "current Garden opening", clue: "In what year did the current Madison Square Garden open?", options: ["1968", "1955", "1973", "1981"], answer: "1968", fact: "The fourth building to carry the Madison Square Garden name opened in 1968." },
  { category: "Origins", difficulty: "Express", subject: "first Knicks game", clue: "Which team did the Knicks defeat in their first game in 1946?", options: ["Toronto Huskies", "Boston Celtics", "Philadelphia Warriors", "Chicago Stags"], answer: "Toronto Huskies", fact: "New York beat Toronto 68-66 in the first game in BAA history." },
  { category: "Legends", difficulty: "Express", subject: "Barnett jump shot", clue: "Which Knicks guard was famous for kicking both legs back on his jump shot?", options: ["Dick Barnett", "Earl Monroe", "Walt Frazier", "Richie Guerin"], answer: "Dick Barnett", fact: "Dick Barnett’s distinctive jumper was accompanied by his phrase “Fall back, baby.”" },
  { category: "Legends", difficulty: "Express", subject: "DeBusschere trade", clue: "Which player arrived in a 1968 trade that helped turn the Knicks into champions?", options: ["Dave DeBusschere", "Jerry Lucas", "Earl Monroe", "Spencer Haywood"], answer: "Dave DeBusschere", fact: "The DeBusschere trade gave New York a cornerstone defender and rebounder." },
  { category: "Draft", difficulty: "Local", subject: "1985 lottery", clue: "Which team won the NBA’s first draft lottery in 1985?", options: ["New York Knicks", "Indiana Pacers", "Golden State Warriors", "Seattle SuperSonics"], answer: "New York Knicks", fact: "New York won the first NBA draft lottery and selected Patrick Ewing." },
  { category: "Playoffs", difficulty: "Express", subject: "Ewing finger roll", clue: "Against which team did Patrick Ewing miss a tying finger roll in Game 7 of the 1995 playoffs?", options: ["Indiana Pacers", "Miami Heat", "Chicago Bulls", "Orlando Magic"], answer: "Indiana Pacers", fact: "Ewing’s last-second attempt rolled out against Indiana in 1995." },
  { category: "Playoffs", difficulty: "Express", subject: "1993 top seed", clue: "What seed did the Knicks earn in the 1993 Eastern Conference playoffs?", options: ["First", "Second", "Third", "Fourth"], answer: "First", fact: "New York won 60 games and secured the East’s top seed in 1992-93." },
  { category: "Records", difficulty: "Express", subject: "1993 wins", clue: "How many regular-season games did the Knicks win in 1992-93?", options: ["60", "57", "62", "55"], answer: "60", fact: "The 1992-93 Knicks finished 60-22." },
  { category: "Legends", difficulty: "Local", subject: "Oakley role", clue: "Which hard-nosed forward became a fan favorite as the Knicks’ enforcer and rebounder?", options: ["Charles Oakley", "Anthony Mason", "Kurt Thomas", "Xavier McDaniel"], answer: "Charles Oakley", fact: "Charles Oakley played ten seasons for New York and embodied its physical style." },
  { category: "Legends", difficulty: "Local", subject: "Mason award", clue: "Which Knick won the NBA Sixth Man of the Year award in 1995?", options: ["Anthony Mason", "John Starks", "Derek Harper", "Charles Smith"], answer: "Anthony Mason", fact: "Anthony Mason won Sixth Man of the Year for the 1994-95 season." },
  { category: "Legends", difficulty: "Local", subject: "Starks dunk", clue: "Which Knicks guard threw down “The Dunk” against Chicago in the 1993 playoffs?", options: ["John Starks", "Derek Harper", "Greg Anthony", "Doc Rivers"], answer: "John Starks", fact: "John Starks’ left-handed baseline dunk became an enduring Knicks highlight." },
  { category: "Awards", difficulty: "Express", subject: "Starks sixth man", clue: "Which Knick won Sixth Man of the Year in 1997?", options: ["John Starks", "Anthony Mason", "Chris Childs", "Hubert Davis"], answer: "John Starks", fact: "John Starks won the 1996-97 Sixth Man of the Year award." },
  { category: "Modern Era", difficulty: "Local", subject: "Amar’e slogan", clue: "Which Knicks star arrived in 2010 proclaiming “The Knicks are back”?", options: ["Amar’e Stoudemire", "Carmelo Anthony", "Tyson Chandler", "Chauncey Billups"], answer: "Amar’e Stoudemire", fact: "Amar’e Stoudemire signed with New York in July 2010." },
  { category: "Awards", difficulty: "Local", subject: "2012-13 DPOY", clue: "Which Knick won Defensive Player of the Year for the 2011-12 season?", options: ["Tyson Chandler", "Iman Shumpert", "Marcus Camby", "Charles Oakley"], answer: "Tyson Chandler", fact: "Tyson Chandler became the first Knick to win Defensive Player of the Year." },
];

const promptTemplates = [
  (fact: TriviaFact) => fact.clue,
  (fact: TriviaFact) => `Next stop, ${fact.category}: ${fact.clue}`,
  (fact: TriviaFact) => `No peeking at the subway map: ${fact.clue}`,
  (fact: TriviaFact) => `Garden-bound pop quiz: ${fact.clue}`,
  (fact: TriviaFact) => `Express train question: ${fact.clue}`,
  (fact: TriviaFact) => `A true New Yorker knows this: ${fact.clue}`,
  (fact: TriviaFact) => `Before the commercials end: ${fact.clue}`,
  (fact: TriviaFact) => `Conductor’s challenge: ${fact.clue}`,
  (fact: TriviaFact) => `One stop from MSG: ${fact.clue}`,
  (fact: TriviaFact) => `Final boarding call: ${fact.clue}`,
];

export const triviaQuestions: TriviaQuestion[] = facts.flatMap((fact, factIndex) =>
  promptTemplates.map((template, templateIndex) => ({
    id: `nyk-${factIndex + 1}-${templateIndex + 1}`,
    category: fact.category,
    difficulty: fact.difficulty,
    question: template(fact),
    options: fact.options,
    answer: fact.answer,
    fact: fact.fact,
  })),
);
