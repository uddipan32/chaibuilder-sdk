/**
 * @vitest-environment happy-dom
 */
import { render, renderHook, screen } from "@testing-library/react";
import { CHAI_SLOT_IDS } from "../../constants/CHAI_SLOT_IDS";
import { ChaiSlot, SLOT_REGISTRY, registerChaiSlot, useChaiSlot } from "./register-chai-slot";

describe("register-chai-slot", () => {
  beforeEach(() => {
    Object.keys(SLOT_REGISTRY).forEach((key) => {
      delete SLOT_REGISTRY[key];
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("CHAI_SLOT_IDS", () => {
    it("should export the expected slot id constants", () => {
      expect(CHAI_SLOT_IDS.TOPBAR_LEFT).toBe("topbar-left");
    });
  });

  describe("registerChaiSlot", () => {
    it("should register a component to a slot", () => {
      const Comp = () => <div>A</div>;
      registerChaiSlot(CHAI_SLOT_IDS.TOPBAR_LEFT, Comp);
      expect(SLOT_REGISTRY[CHAI_SLOT_IDS.TOPBAR_LEFT]).toHaveLength(1);
      expect(SLOT_REGISTRY[CHAI_SLOT_IDS.TOPBAR_LEFT][0]).toBe(Comp);
    });

    it("should allow multiple components to be registered to the same slot", () => {
      const CompA = () => <div>A</div>;
      const CompB = () => <div>B</div>;
      const CompC = () => <div>C</div>;
      registerChaiSlot(CHAI_SLOT_IDS.TOPBAR_RIGHT, CompA);
      registerChaiSlot(CHAI_SLOT_IDS.TOPBAR_RIGHT, CompB);
      registerChaiSlot(CHAI_SLOT_IDS.TOPBAR_RIGHT, CompC);
      expect(SLOT_REGISTRY[CHAI_SLOT_IDS.TOPBAR_RIGHT]).toHaveLength(3);
      expect(SLOT_REGISTRY[CHAI_SLOT_IDS.TOPBAR_RIGHT][0]).toBe(CompA);
      expect(SLOT_REGISTRY[CHAI_SLOT_IDS.TOPBAR_RIGHT][1]).toBe(CompB);
      expect(SLOT_REGISTRY[CHAI_SLOT_IDS.TOPBAR_RIGHT][2]).toBe(CompC);
    });

    it("should register components to different slots independently", () => {
      const CompLeft = () => <div>Left</div>;
      const CompRight = () => <div>Right</div>;
      registerChaiSlot(CHAI_SLOT_IDS.TOPBAR_LEFT, CompLeft);
      registerChaiSlot(CHAI_SLOT_IDS.TOPBAR_RIGHT, CompRight);
      expect(SLOT_REGISTRY[CHAI_SLOT_IDS.TOPBAR_LEFT]).toHaveLength(1);
      expect(SLOT_REGISTRY[CHAI_SLOT_IDS.TOPBAR_RIGHT]).toHaveLength(1);
    });

    it("should support arbitrary string slot ids", () => {
      const Comp = () => <div>Custom</div>;
      registerChaiSlot("my-custom-slot", Comp);
      expect(SLOT_REGISTRY["my-custom-slot"]).toHaveLength(1);
      expect(SLOT_REGISTRY["my-custom-slot"][0]).toBe(Comp);
    });
  });

  describe("useChaiSlot", () => {
    it("should return an empty array for an unregistered slot", () => {
      const { result } = renderHook(() => useChaiSlot(CHAI_SLOT_IDS.TOPBAR_LEFT));
      expect(result.current).toEqual([]);
    });

    it("should return all components registered to a slot in order", () => {
      const CompA = () => <div>A</div>;
      const CompB = () => <div>B</div>;
      registerChaiSlot(CHAI_SLOT_IDS.TOPBAR_CENTER, CompA);
      registerChaiSlot(CHAI_SLOT_IDS.TOPBAR_CENTER, CompB);
      const { result } = renderHook(() => useChaiSlot(CHAI_SLOT_IDS.TOPBAR_CENTER));
      expect(result.current).toHaveLength(2);
      expect(result.current[0]).toBe(CompA);
      expect(result.current[1]).toBe(CompB);
    });

    it("should not return components registered to a different slot", () => {
      const Comp = () => <div>Right only</div>;
      registerChaiSlot(CHAI_SLOT_IDS.TOPBAR_RIGHT, Comp);
      const { result } = renderHook(() => useChaiSlot(CHAI_SLOT_IDS.TOPBAR_LEFT));
      expect(result.current).toEqual([]);
    });
  });

  describe("ChaiSlot", () => {
    it("should render nothing when no components are registered", () => {
      const { container } = render(<ChaiSlot slotId={CHAI_SLOT_IDS.TOPBAR_LEFT} />);
      expect(container.firstChild).toBeNull();
    });

    it("should render a single registered component", () => {
      const Comp = () => <div data-testid="slot-comp">Hello</div>;
      registerChaiSlot(CHAI_SLOT_IDS.TOPBAR_LEFT, Comp);
      render(<ChaiSlot slotId={CHAI_SLOT_IDS.TOPBAR_LEFT} />);
      expect(screen.getByTestId("slot-comp")).toBeDefined();
    });

    it("should render multiple registered components in registration order", () => {
      const CompA = () => <div data-testid="comp-a">A</div>;
      const CompB = () => <div data-testid="comp-b">B</div>;
      registerChaiSlot(CHAI_SLOT_IDS.TOPBAR_RIGHT, CompA);
      registerChaiSlot(CHAI_SLOT_IDS.TOPBAR_RIGHT, CompB);
      render(<ChaiSlot slotId={CHAI_SLOT_IDS.TOPBAR_RIGHT} />);
      const a = screen.getByTestId("comp-a");
      const b = screen.getByTestId("comp-b");
      expect(a).toBeDefined();
      expect(b).toBeDefined();
      expect(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("should isolate a crashing component and still render other components", () => {
      const CrashingComp = () => {
        throw new Error("Plugin crash!");
      };
      const HealthyComp = () => <div data-testid="healthy">OK</div>;
      registerChaiSlot(CHAI_SLOT_IDS.TOPBAR_CENTER, CrashingComp);
      registerChaiSlot(CHAI_SLOT_IDS.TOPBAR_CENTER, HealthyComp);
      render(<ChaiSlot slotId={CHAI_SLOT_IDS.TOPBAR_CENTER} />);
      expect(screen.getByTestId("healthy")).toBeDefined();
      expect(console.error).toHaveBeenCalled();
    });

    it("should log an error with slot id and component index when a plugin crashes", () => {
      const CrashingComp = () => {
        throw new Error("boom");
      };
      registerChaiSlot("error-slot", CrashingComp);
      render(<ChaiSlot slotId="error-slot" />);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('"error-slot"'), expect.any(Error));
    });

    it("should pass context to slot components", () => {
      const Comp = ({ message, count }: any) => (
        <div data-testid="context-comp">
          {message}-{count}
        </div>
      );
      registerChaiSlot("context-slot", Comp);
      render(<ChaiSlot slotId="context-slot" context={{ message: "hello", count: 42 }} />);
      const element = screen.getByTestId("context-comp");
      expect(element.textContent).toBe("hello-42");
    });

    it("should render only last component when multiple=false", () => {
      const CompA = () => <div data-testid="comp-a">A</div>;
      const CompB = () => <div data-testid="comp-b">B</div>;
      const CompC = () => <div data-testid="comp-c">C</div>;
      registerChaiSlot("single-slot", CompA);
      registerChaiSlot("single-slot", CompB);
      registerChaiSlot("single-slot", CompC);
      render(<ChaiSlot slotId="single-slot" multiple={false} />);
      expect(screen.queryByTestId("comp-a")).toBeNull();
      expect(screen.queryByTestId("comp-b")).toBeNull();
      expect(screen.getByTestId("comp-c")).toBeDefined();
    });

    it("should render all components when multiple=true", () => {
      const CompA = () => <div data-testid="comp-a">A</div>;
      const CompB = () => <div data-testid="comp-b">B</div>;
      registerChaiSlot("multi-slot", CompA);
      registerChaiSlot("multi-slot", CompB);
      render(<ChaiSlot slotId="multi-slot" multiple={true} />);
      expect(screen.getByTestId("comp-a")).toBeDefined();
      expect(screen.getByTestId("comp-b")).toBeDefined();
    });

    it("should render default component when no components registered", () => {
      const DefaultComp = () => <div data-testid="default">Default Content</div>;
      render(<ChaiSlot slotId="empty-slot" defaultComponent={DefaultComp} />);
      expect(screen.getByTestId("default")).toBeDefined();
    });

    it("should pass context to default component", () => {
      const DefaultComp = ({ name }: any) => <div data-testid="default">{name}</div>;
      render(<ChaiSlot slotId="empty-slot" defaultComponent={DefaultComp} context={{ name: "Test" }} />);
      const element = screen.getByTestId("default");
      expect(element.textContent).toBe("Test");
    });

    it("should not render default component when components are registered", () => {
      const DefaultComp = () => <div data-testid="default">Default</div>;
      const ActualComp = () => <div data-testid="actual">Actual</div>;
      registerChaiSlot("with-default", ActualComp);
      render(<ChaiSlot slotId="with-default" defaultComponent={DefaultComp} />);
      expect(screen.queryByTestId("default")).toBeNull();
      expect(screen.getByTestId("actual")).toBeDefined();
    });
  });
});
