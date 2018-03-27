#include <iostream>
#include <iomanip>
#include <cmath>
#include <climits>
#include <algorithm>
#include <vector>
#include <array>
#include <queue>
#include <stack>
#include <set>
#include <unordered_set>
#include <map>
#include <unordered_map>
using namespace std;

#define PI 3.14159265
#define PHI 1.61803398

#define D(x) cerr << #x << " = " << (x) << ", "

typedef unsigned int uint;
typedef unsigned long ul;
typedef unsigned long long ull;
typedef long long ll;
typedef long double ld;
typedef unsigned char byte;

template<typename T> using V = vector<T>;
template<typename T, typename U> using P = pair<T,U>;
template<typename T, typename U> using umap = unordered_map<T,U>;
template<typename T, typename U> using uset = unordered_set<T,U>;
template<typename T> using min_heap = priority_queue<T, vector<T>, greater<T>>;
template<typename T> using max_heap = priority_queue<T>;

// grid values
#define SELF 0
#define ENEMY 1
#define FREE 2
// check_winner return values
#define TIE 0
#define TURN_WINNER 1
#define NO_WINNER 2

V<V<byte>> grid(3, V<byte>(3, FREE));
int turn_count = 0;

template <typename T1, typename T2>
std::ostream& operator<<(std::ostream& os, const std::pair<T1, T2> p)
{
    os << p.first << ' ' << p.second;
    return os;
}

byte check_winner(int player)
{
    for (int x = 0; x < 3; x++){
        int xCount = 0, yCount = 0;
        for (int y = 0; y < 3; y++){
            if (grid[y][x] == player) yCount++;
            if (grid[x][y] == player) xCount++;
            if (xCount == 3 || yCount == 3) return TURN_WINNER;
        }
    }

    int diagCount = 0;
    for (int x = 0, y = 0; x < 3; x++, y++) {
        if (grid[y][x] == player)
            diagCount++;
    }
    if (diagCount == 3) return TURN_WINNER;

    diagCount = 0;
    for (int x = 0, y = 2; x < 3; x++, y--) {
        if (grid[y][x] == player) diagCount++;
    }
    if (diagCount == 3) return TURN_WINNER;

    if (turn_count >= 9) return TIE;

    return NO_WINNER;
}

int minimax(int turn, int depth, int alpha, int beta)
{
    int best = (turn == SELF ? INT_MIN : INT_MAX);
    for (int y = 0; y < 3; ++y) {
        for (int x = 0; x < 3; ++x) {
            if (grid[y][x] == FREE) {
                grid[y][x] = turn;

                byte winner = check_winner(turn);

                if (winner == NO_WINNER) {
                    int score = minimax(!turn, depth+1);
                    if (turn == SELF) {
                        best = max(best, score);
                        alpha = max(alpha, best);
                    }
                    else if (turn == ENEMY) {
                        best = min(best, score);
                        beta = min(beta, best);
                    }
                    if (beta <= alpha) break;
                }
                else { // winner != NO_WINNER
                    int score = TIE; // 0
                    if (winner == TURN_WINNER) {
                        score = (10-depth);
                    }
                    if (turn == SELF)  best = max(best, score);
                    if (turn == ENEMY) best = min(best, -score);
                }

                // Restore
                grid[y][x] = FREE;
            }
        }
    }
    return best;
}

void play_turn()
{
    ++turn_count;

    P<int,int> move = {-1, -1};
    int best = INT_MIN;

    for (int y = 0; y < 3; ++y) {
        for (int x = 0; x < 3; ++x) {
            if (grid[y][x] == FREE) {
                grid[y][x] = SELF;

                int score = minimax(ENEMY, 0, INT_MIN, INT_MAX);
                // cerr << make_pair(x, y) << " " << score << endl;
                if (score > best) {
                    move = {y, x};
                    best = score;
                }

                // Restore
                grid[y][x] = FREE;
            }
        }
    }

    grid[move.first][move.second] = SELF;
    cout << move.first << move.second << endl;
}

int main(int argc, char** argv)
{
    for (int y = 0; y < 3; ++y) {
        for (int x = 0; x < 3; ++x) {
            switch (argv[1][3*y+x]) {
                case '-':
                    grid[y][x] = FREE;
                    break;
                case 'x':
                    grid[y][x] = ENEMY;
                    break;
                case 'y':
                    grid[y][x] = SELF;
                    break;
            }
        }
    }

    play_turn();
}