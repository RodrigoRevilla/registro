import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Impresiones } from './impresiones';

describe('Impresiones', () => {
  let component: Impresiones;
  let fixture: ComponentFixture<Impresiones>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Impresiones]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Impresiones);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
