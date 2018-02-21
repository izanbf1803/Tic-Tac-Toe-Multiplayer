#include <iostream>
#include <vector>
#include <climits>
using namespace std;

#define D(x) cerr << #x << " = " << (x) << ", "

template<typename T> using V = vector<T>;
template<typename T, typename U> using P = pair<T,U>;

const V<char> FICHAS = {'x', 'y'};

V<V<char>> grid;

char checkWinner(char ficha)
{
    int game_step = 0;
    for (int x = 0; x < 3; ++x) {
        for (int y = 0; y < 3; ++y) {
            if (grid[x][y] != '-') ++game_step;
        }
    }

    for (int x = 0; x < 3; x++){
        int xCount = 0, yCount = 0;
        for (int y = 0; y < 3; y++){
            if (grid[x][y] == ficha) xCount++;
            if (grid[y][x] == ficha) yCount++;
            if (xCount == 3 || yCount == 3) return ficha;
        }
    }

    int diagCount = 0;
    for (int x = 0, y = 0; x < 3; x++, y++) {
        if (grid[x][y] == ficha)
            diagCount++;
    }
    if (diagCount == 3) return ficha;

    diagCount = 0;
    for (int x = 0, y = 2; x < 3; x++, y--) {
        if (grid[x][y] == ficha) diagCount++;
    }
    if (diagCount == 3) return ficha;

    if (game_step == 9) return 'T'; // tie

    return '-'; 
}   

int minimax(int turn)
{
    int best = (turn == 1 ? INT_MIN : INT_MAX);
    for (int x = 0; x < 3; ++x) {
        for (int y = 0; y < 3; ++y) {
            if (grid[x][y] == '-') {
                grid[x][y] = FICHAS[turn];

                char winner = checkWinner(FICHAS[turn]);

                if (winner == '-') {
                    int score = minimax(0);
                    if ((turn == 1 and score > best) or (turn == 0 and score < best)) {
                        best = score;
                    }
                }

                // Restore
                grid[x][y] = '-';

                if (winner != '-') {
                    if (winner == 'x') return (turn == 1 ? -1 : 1);
                    if (winner == 'y') return (turn == 1 ? 1 : -1);
                    if (winner == 'T') return 0;
                }
            }
        }
    }
    return best;
}

int main(int argc, char** argv)
{
    P<int,int> move = {-1, -1};
    grid = V<V<char>>(3, V<char>(3, '-'));
    for (int x = 0; x < 3; ++x) {
        for (int y = 0; y < 3; ++y) {
            grid[x][y] = argv[1][3*x+y];
            if (grid[x][y] == '-' and move.first == -1) {
                move = {x, y};
            }
        }
    }

    int best = INT_MIN;

    for (int x = 0; x < 3; ++x) {
        for (int y = 0; y < 3; ++y) {
            if (grid[x][y] == '-') {
                grid[x][y] = 'y';

                int score = minimax(0);
                if (score > best) {
                    move = {x, y};
                    best = score;
                }

                // Restore
                grid[x][y] = '-';
            }
        }
    }

    cout << move.first << move.second << endl;
}