# test_cplex_pyomo.py
import pyomo.environ as pyo

def main():
    # Build a tiny linear program:
    # max 3x + 2y
    # s.t. x + y <= 4
    #      x <= 2
    #      y <= 3
    #      x, y >= 0
    model = pyo.ConcreteModel()

    model.x = pyo.Var(domain=pyo.NonNegativeReals)
    model.y = pyo.Var(domain=pyo.NonNegativeReals)

    model.obj = pyo.Objective(
        expr=3 * model.x + 2 * model.y,
        sense=pyo.maximize
    )

    model.c1 = pyo.Constraint(expr=model.x + model.y <= 4)
    model.c2 = pyo.Constraint(expr=model.x <= 2)
    model.c3 = pyo.Constraint(expr=model.y <= 3)

    # Preferred if the CPLEX Python API is installed
    solver = pyo.SolverFactory("cplex")

    # Fallback option if you want to use the cplex executable instead:
    # solver = pyo.SolverFactory("cplex")

    if not solver.available(False):
        raise RuntimeError(
            "CPLEX is not available to Pyomo.\n"
            "Try one of these:\n"
            "1) Install/configure IBM CPLEX properly\n"
            "2) Ensure the 'cplex' Python package is available for cplex_direct\n"
            "3) Or switch to SolverFactory('cplex') if the cplex executable is on PATH"
        )

    results = solver.solve(model, tee=True)

    print("\n=== Solver status ===")
    print("Status:", results.solver.status)
    print("Termination:", results.solver.termination_condition)

    print("\n=== Solution ===")
    print(f"x = {pyo.value(model.x):.6g}")
    print(f"y = {pyo.value(model.y):.6g}")
    print(f"obj = {pyo.value(model.obj):.6g}")

    # Expected optimum:
    # x = 2, y = 2, obj = 10
    assert abs(pyo.value(model.x) - 2.0) < 1e-6
    assert abs(pyo.value(model.y) - 2.0) < 1e-6
    assert abs(pyo.value(model.obj) - 10.0) < 1e-6

    print("\nCPLEX + Pyomo test passed.")

if __name__ == "__main__":
    main()