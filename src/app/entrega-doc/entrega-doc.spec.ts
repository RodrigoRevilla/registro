import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EntregaDoc } from './entrega-doc';

describe('EntregaDoc', () => {
  let component: EntregaDoc;
  let fixture: ComponentFixture<EntregaDoc>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntregaDoc]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EntregaDoc);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
