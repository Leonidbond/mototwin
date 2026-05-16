/** Минимальные типы JS API 2.1 для интеграции без npm-пакета. */
declare namespace ymaps {
  function ready(callback: () => void): void;

  class Map {
    constructor(element: string | HTMLElement, state: { center: number[]; zoom: number }, options?: object);
    geoObjects: GeoObjectCollection;
    setCenter(center: number[], zoom?: number): void;
    events: IEventManager;
    destroy(): void;
  }

  class Placemark {
    constructor(
      geometry: number[],
      properties?: { balloonContent?: string; hintContent?: string },
      options?: object
    );
  }

  class SuggestView {
    constructor(element: string | HTMLElement, options?: { results?: number });
    events: IEventManager;
    destroy(): void;
  }

  interface IEventManager {
    add(types: string, callback: (event: IEvent) => void): void;
  }

  interface IEvent {
    get<T>(name: string): T;
  }

  interface GeoObjectCollection {
    add(object: Placemark): void;
    removeAll(): void;
  }

  function geocode(query: string | number[]): Promise<IGeocodeResult>;

  interface IGeocodeResult {
    geoObjects: {
      get(index: number): IGeoObject | null;
    };
  }

  interface IGeoObject {
    geometry: {
      getCoordinates(): number[];
    };
    getAddressLine(): string;
    properties: {
      get(name: string): string;
    };
  }
}
