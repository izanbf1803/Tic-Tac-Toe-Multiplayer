#include <iostream>
#include <vector>
using namespace std;

#define D(x) cerr << #x << " = " << (x) << ", "

template<typename T> using V = vector<T>;

int main(int argc, char** argv)
{
    V<V<char>> grid(3, V<char>(3, '-'));
    for (int x = 0; x < 3; ++x) {
        for (int y = 0; y < 3; ++y) {
            grid[x][y] = argv[1][3*x+y];
        }
    }

    
}